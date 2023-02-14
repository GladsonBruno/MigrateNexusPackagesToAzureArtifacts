import axios from 'axios';
import * as Path from 'path';
import { exit } from 'process';

import { MavenFileDownloader } from '../downloader/MavenFileDownloader';
import { Utils } from '../utils/Utils';
import { MavenUtils } from '../utils/MavenUtils';
import { ConsoleUtils } from '../utils/ConsoleUtils';

export class NexusMavenImporter {

    private azure_username: any;
    private download_folder_name: any;
    private feed_name: any;
    private feed_source_url: any;
    private nexus_url: any;
    private repository_name: any;
    private upload_limit_size_in_mb: number | undefined;
    private utils: Utils = new Utils();
    private consoleUtils: ConsoleUtils = new ConsoleUtils();
    private mavenUtils: MavenUtils = new MavenUtils();

    constructor (azure_username: any, download_folder_name: any, feed_name: any,
        feed_source_url: any, nexus_url: any, repository_name: any, upload_limit_size_in_mb: number | undefined) {
            this.azure_username = azure_username;
            this.download_folder_name = download_folder_name;
            this.feed_name = feed_name;
            this.feed_source_url = feed_source_url;
            this.nexus_url = nexus_url;
            this.repository_name = repository_name;
            this.upload_limit_size_in_mb = upload_limit_size_in_mb;
    }

    async importPackagesFromNexus() {
        let query_url = `${this.nexus_url}/service/rest/v1/components?repository=${this.repository_name}`;

        this.consoleUtils.printSuccess('Iniciando processamento de pacotes Maven!');
        this.consoleUtils.printSuccess('Processamento em andamento...');
        try {
            let packages_to_download_infos: any[] = [];
            let continuationToken = null;
            do {
                let response = null;
                let data = null;
                if (packages_to_download_infos.length == 0) {
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

                this.extractPackageToDownloadInfos(data, packages_to_download_infos);

            } while(continuationToken !== null);            

            await this.utils.verifyIfFolderDownloadExists(this.download_folder_name);

            for (let i = 0; i < packages_to_download_infos.length; i++) {
                let package_infos = packages_to_download_infos[i];
                let mavenFileDownloader: MavenFileDownloader = new MavenFileDownloader(this.download_folder_name, package_infos, this.repository_name, this.nexus_url);
                this.consoleUtils.printSuccess(`Iniciando download do pacote ${package_infos.package_name} (${i +1} de ${packages_to_download_infos.length})`);
                await mavenFileDownloader.downloadPomFile();
                await mavenFileDownloader.downloadDependencyFile();
                
                let dependency_file_path = Path.resolve(__dirname, '../../', this.download_folder_name, package_infos.package_name);
                let pom_file_path = Path.resolve(__dirname, '../../', this.download_folder_name, package_infos.pom_file_name);

                if (this.upload_limit_size_in_mb !== undefined) {

                    let file_size = await this.mavenUtils.getFilesizeInBytes(dependency_file_path);

                    if (file_size > this.upload_limit_size_in_mb) {
                        this.consoleUtils.printWarning(`O pacote ${package_infos.package_name} possui mais do que ${this.upload_limit_size_in_mb} Megabytes! Tamanho do pacote: ${file_size.toFixed(2)} MB`);
                        this.consoleUtils.printWarning(`Ignorando publicação no nexus!`);

                        await this.utils.deleteFile(dependency_file_path);
                        await this.utils.deleteFile(pom_file_path);

                        continue;
                    }

                }

                try {
                    this.consoleUtils.printSuccess(`Iniciando publicação do pacote ${package_infos.package_name}  (${i +1} de ${packages_to_download_infos.length})`);
                    await this.mavenUtils.publishPackageInAzureArtifacts(this.feed_name, this.feed_source_url, package_infos, dependency_file_path, pom_file_path);
                    this.consoleUtils.printSuccess(`Pacote ${package_infos.package_name} publicado com sucesso!`);
                } catch(error: any) {
                    this.consoleUtils.printError(`Falha na publicação do pacote ${package_infos.package_name}`);
                    this.consoleUtils.printError(error);                  
                } finally {
                    await this.utils.deleteFile(dependency_file_path);
                    await this.utils.deleteFile(pom_file_path);
                }
            }
            this.consoleUtils.printSuccess(`Processamento finalizado!`);
        } catch (err: any) {
            this.consoleUtils.printError('Falha no processamento!');
            this.consoleUtils.printError(err);
            exit(1);
        }
        
    }

    private extractPackageToDownloadInfos(data: any, packages_to_download_infos: any []): any[] {

        const JAR_PACKAGE = "jar";
        const WAR_PACKAGE = "war";
        const EAR_PACKAGE = "ear";

        for(const item of data.items){
            let actual_package = item;
            let group_id = actual_package.group;
            let artifact_id = actual_package.name;
            let version = actual_package.version;
            let package_type = null;
            let package_name = null;
            let assets = actual_package.assets;
            let pom_file_name = null;
            let pom_file_download_url = null;
            for (const asset of assets){
                let actual_asset = asset;
                if (actual_asset.path.endsWith(".jar")) {
                    package_type = JAR_PACKAGE;
                    let path_splited = actual_asset.path.split("/");
                    package_name = path_splited[path_splited.length - 1];
                } else if (actual_asset.path.endsWith(".war")) {
                    package_type = WAR_PACKAGE;
                    let path_splited = actual_asset.path.split("/");
                    package_name = path_splited[path_splited.length - 1];
                } else if (actual_asset.path.endsWith(".ear")) {
                    package_type = EAR_PACKAGE;
                    let path_splited = actual_asset.path.split("/");
                    package_name = path_splited[path_splited.length - 1];
                } else if (actual_asset.path.endsWith(".pom")) {
                    pom_file_download_url = actual_asset.downloadUrl;
                    let path_splited = actual_asset.path.split("/");
                    pom_file_name = path_splited[path_splited.length - 1];
                }
            }

            if (package_type == null) {
                throw new Error(`Erro! O pacote de groupId ${group_id}, artifactId ${artifact_id} e versão ${version} não pertence aos tipos de arquivo .jar, .war ou .ear!`)
            }

            if (pom_file_name !== null && pom_file_download_url !== null) {
                packages_to_download_infos.push({
                    artifact: `${group_id}:${artifact_id}:${version}:${package_type}`,
                    artifact_id: artifact_id,
                    group_id: group_id,
                    package_name: package_name,
                    package_type: package_type,
                    pom_file_download_url: pom_file_download_url,
                    pom_file_name: pom_file_name,
                    version: version
                });
            } else {
                this.consoleUtils.printWarning(`O pacote ${package_name} não possui pomfile! Ignorando importação do mesmo!`);
            }
        }
        return packages_to_download_infos;
    }

}