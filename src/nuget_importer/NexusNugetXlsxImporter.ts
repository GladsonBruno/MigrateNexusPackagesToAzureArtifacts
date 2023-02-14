import axios from 'axios';
import { exit } from 'process';
import * as Path from 'path';
import * as dotenv from "dotenv";
dotenv.config({ path: Path.resolve(__dirname, '../', '.env') });

import { NugetFileDownloader } from '../downloader/NugetFileDownloader';
import { Utils } from '../utils/Utils';
import { NugetUtils } from '../utils/NugetUtils';
import { ConsoleUtils } from '../utils/ConsoleUtils';


export class NexusNugetXlsxImporter {

    private azure_username: any;
    private download_folder_name: any;
    private nexus_url: any;
    private migration_configs: any;
    private utils: Utils = new Utils();
    private consoleUtils: ConsoleUtils = new ConsoleUtils();
    private nugetUtils: NugetUtils = new NugetUtils();

    constructor (azure_username: any, download_folder_name: any,  nexus_url: any, migration_configs: any) {
            this.azure_username = azure_username;
            this.download_folder_name = download_folder_name;
            this.nexus_url = nexus_url;
            this.migration_configs = migration_configs;
    }

    async importXlsxPackagesFromNexus(nuget_data: any[]) {

        let packages_download_infos = [];
        let feed_name = this.migration_configs.nuget_azure_feed_name;
        let feed_source_url = this.migration_configs.nuget_azure_feed_url;

        this.consoleUtils.printSuccess(`Iniciando processamento de pacotes Nuget via planilha XLSX`);
        this.consoleUtils.printSuccess('Processamento em andamento...');

        for (let actual_package of nuget_data) {

            let query_url = `${this.nexus_url}/service/rest/v1/search/assets?repository=${actual_package.nexus_repository}&`
            query_url += `name=${actual_package.package_name}&version=${actual_package.package_version}`;
            let response = await axios.get(query_url);
            let data = response.data;

            for(const actual_package of data.items){
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

        }

        await this.utils.verifyIfFolderDownloadExists(this.download_folder_name);

        try {
            await this.nugetUtils.addNugetSourceInNugetConfig(feed_name, feed_source_url, this.azure_username);
        } catch(err) {
            this.consoleUtils.printWarning(`Falha ao adicionar o source Nuget ${feed_name}!`);
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
                await this.nugetUtils.publishPackageInAzureArtifacts(feed_name, file_path);
                this.consoleUtils.printSuccess(`Pacote ${file_name} publicado com sucesso!`);
            } catch(error: any) {
                this.consoleUtils.printError(`Falha na publicação do pacote ${file_name}`);
                this.consoleUtils.printError(error);                    
            } finally {
                await this.utils.deleteFile(file_path);
            }

        }
        this.consoleUtils.printSuccess(`Processamento finalizado!`);
    } catch (err: any) {
        this.consoleUtils.printError('Falha no processamento!');
        this.consoleUtils.printError(err);
        exit(1);
    }

}