import axios from 'axios';
import * as Path from 'path';
import { exit } from 'process';

import { MavenFileDownloader } from '../downloader/MavenFileDownloader';
import { Utils } from '../utils/Utils';
import { MavenUtils } from '../utils/MavenUtils';
import { ConsoleUtils } from '../utils/ConsoleUtils';

export class NexusMavenXlsxImporter {

    private azure_username: any;
    private download_folder_name: any;
    private nexus_url: any;
    private migration_configs: any;
    private upload_limit_size_in_mb: number | undefined;
    private utils: Utils = new Utils();
    private consoleUtils: ConsoleUtils = new ConsoleUtils();
    private mavenUtils: MavenUtils = new MavenUtils();

    constructor (azure_username: any, download_folder_name: any,  nexus_url: any, migration_configs: any, upload_limit_size_in_mb: number | undefined) {
            this.azure_username = azure_username;
            this.download_folder_name = download_folder_name;
            this.nexus_url = nexus_url;
            this.migration_configs = migration_configs;
            this.upload_limit_size_in_mb = upload_limit_size_in_mb;
    }

    async importXlsxPackagesFromNexus(maven_data: any[]) {

        process.env['feed_name'] = this.migration_configs.maven_azure_feed_name;

        let packages_to_download_infos: any[] = [];
        let feed_name = this.migration_configs.maven_azure_feed_name;
        let feed_source_url = this.migration_configs.maven_azure_feed_url;
        

        this.consoleUtils.printSuccess(`Iniciando processamento de pacotes Maven via planilha XLSX`);
        this.consoleUtils.printSuccess('Processamento em andamento...');

        try {

            for (let actual_package of maven_data) {

                let query_url = `${this.nexus_url}/service/rest/v1/search/assets?repository=${actual_package.nexus_repository}&`
                query_url += `group=${actual_package.group_id}&name=${actual_package.artifact_id}&version=${actual_package.package_version}`;
                let response = await axios.get(query_url);
                let data = response.data;
    
                this.extractPackageToDownloadInfos(actual_package, data, packages_to_download_infos);

            }

            await this.utils.verifyIfFolderDownloadExists(this.download_folder_name);

            for (let i = 0; i < packages_to_download_infos.length; i++) {
                let package_infos = packages_to_download_infos[i];
                let mavenFileDownloader: MavenFileDownloader = new MavenFileDownloader(this.download_folder_name, package_infos, package_infos.nexus_repository, this.nexus_url);
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
                    await this.mavenUtils.publishPackageInAzureArtifacts(feed_name, feed_source_url, package_infos, dependency_file_path, pom_file_path);
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

    private extractPackageToDownloadInfos(actual_package: any, data: any, packages_to_download_infos: any []): any[] {

        const JAR_PACKAGE = "jar";
        const WAR_PACKAGE = "war";
        const EAR_PACKAGE = "ear";

        let group_id = actual_package.group_id;
        let artifact_id = actual_package.artifact_id;
        let version = actual_package.package_version;
        let package_name = "";
        let package_type = null;
        let pom_file_name = null;
        let pom_file_download_url = null;


        for(let actual_asset of data.items){

            if (actual_asset.path.endsWith(".jar")) {
                package_type = JAR_PACKAGE;
                package_name = `${artifact_id}.${JAR_PACKAGE}`;
            } else if (actual_asset.path.endsWith(".war")) {
                package_type = WAR_PACKAGE;
                package_name = `${artifact_id}.${WAR_PACKAGE}`;
            } else if (actual_asset.path.endsWith(".ear")) {
                package_type = EAR_PACKAGE;
                package_name = `${artifact_id}.${EAR_PACKAGE}`;
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
                version: version,
                nexus_repository: actual_package.nexus_repository
            })
            return packages_to_download_infos;
        } else {
            this.consoleUtils.printWarning(`O pacote ${package_name} não possui pomfile! Ignorando importação do mesmo!`);
            return [];
        }

    }

}