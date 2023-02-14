import axios from 'axios';
import { exit } from 'process';
import * as Path from 'path';
import * as dotenv from "dotenv";
dotenv.config({ path: Path.resolve(__dirname, '../', '.env') });

import { NugetFileDownloader } from '../downloader/NugetFileDownloader';
import { Utils } from '../utils/Utils';
import { NugetUtils } from '../utils/NugetUtils';
import { ConsoleUtils } from '../utils/ConsoleUtils';

export class NexusNugetImporter {

    private azure_username: any;
    private download_folder_name: any;
    private feed_name: any;
    private feed_source_url: any;
    private nexus_url: any;
    private repository_name: any;
    private utils: Utils = new Utils();
    private consoleUtils: ConsoleUtils = new ConsoleUtils();
    private nugetUtils: NugetUtils = new NugetUtils();

    constructor (azure_username: any, download_folder_name: any, feed_name: any,
        feed_source_url: any, nexus_url: any, repository_name: any) {
            this.azure_username = azure_username;
            this.download_folder_name = download_folder_name;
            this.feed_name = feed_name;
            this.feed_source_url = feed_source_url;
            this.nexus_url = nexus_url;
            this.repository_name = repository_name;
    }

    async importPackagesFromNexus() {
        let query_url = `${this.nexus_url}/service/rest/v1/search/assets?repository=${this.repository_name}`;
        this.consoleUtils.printSuccess('Iniciando processamento de pacotes Nuget!');
        this.consoleUtils.printSuccess('Processamento em andamento...');
        try {
            let packages_download_infos = [];
            let continuationToken = null;
            do {
                let response = null;
                let data = null;
                if (packages_download_infos.length == 0) {
                    response = await axios.get(query_url);
                    data = response.data;
                    continuationToken = data.continuationToken;
                    if (data.items.length == 0) {
                        throw new Error("Não existem pacotes a importar no repositório informado!")
                    }
                } else {
                    let next_page_query_url: string = `${query_url}&continuationToken=${continuationToken}`;
                    response = await axios.get(next_page_query_url);
                    data = response.data;
                    continuationToken = data.continuationToken;
                }

                for(let i = 0; i < data.items.length; i++){
                    let actual_package = data.items[i];
                    let package_infos = actual_package.path.split("/");
                    let package_name = package_infos[0];
                    let package_version = package_infos[1];
                    let download_url = actual_package.downloadUrl;
    
                    packages_download_infos.push({
                        name: package_name,
                        version: package_version,
                        download_url: download_url
                    })
                }
            } while(continuationToken !== null);

            await this.utils.verifyIfFolderDownloadExists(this.download_folder_name);

            try {
                await this.nugetUtils.addNugetSourceInNugetConfig(this.feed_name, this.feed_source_url, this.azure_username);
            } catch(err) {
                this.consoleUtils.printWarning(`Falha ao adicionar o source Nuget ${this.feed_name}!`);
                this.consoleUtils.printWarning('Provavelmente já existe um source igual cadastrado no arquivo nuget.config');
                this.consoleUtils.printError(err);
            }            

            for (let i = 0; i < packages_download_infos.length; i++) {
                let actual_package_infos = packages_download_infos[i];
                let file_name = `${actual_package_infos.name}.${actual_package_infos.version}.nupkg`;

                let nugetFileDownloader = new NugetFileDownloader(this.download_folder_name, file_name, actual_package_infos.download_url);
                await nugetFileDownloader.downloadFile();

                let file_path = Path.resolve(__dirname, '../../', this.download_folder_name, file_name);
                try {
                    this.consoleUtils.printSuccess(`Iniciando publicação do pacote ${file_name}  (${i +1} de ${packages_download_infos.length})`);
                    await this.nugetUtils.publishPackageInAzureArtifacts(this.feed_name, file_path);
                    this.consoleUtils.printSuccess(`Pacote ${file_name} publicado com sucesso!`);
                } catch(error: any) {
                    this.consoleUtils.printError(`Falha na publicação do pacote ${file_name}`);
                    this.consoleUtils.printError(error);                    
                } finally {
                    await this.utils.deleteFile(file_path);
                }

            }
            this.consoleUtils.printSuccess(`Processamento finalizado!`);
        } catch (err) {
            this.consoleUtils.printError('Falha no processamento!');
            this.consoleUtils.printError(err);
            exit(1);
        }
    }

}