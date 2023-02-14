import { NexusNugetImporter } from './nuget_importer/NexusNugetImporter';
import { NexusNugetXlsxImporter } from './nuget_importer/NexusNugetXlsxImporter';
import { NexusMavenImporter } from './maven_importer/NexusMavenImporter';
import { NexusMavenXlsxImporter } from './maven_importer/NexusMavenXlsxImporter';
import { exit } from 'process';
import * as Path from 'path';
import * as dotenv from "dotenv";
dotenv.config({ path: Path.resolve(__dirname, '../', '.env') });

import { ConsoleUtils } from './utils/ConsoleUtils';

export class NexusImporter {

    azure_username: any;
    azure_token: any;
    download_folder_name: any;
    feed_name: any;
    feed_source_url: any;
    nexus_url: any;
    repository_name: any;
    package_type: any;
    migration_type: any;
    xlsx_file_path: any;
    upload_limit_size_in_mb: number | undefined;

    batch_migration = "batch";
    xlsx_migration = "xlsx";

    consoleUtils: ConsoleUtils = new ConsoleUtils();

    constructor() {
        this.azure_username = process.env.azure_username;
        this.azure_token = process.env.azure_token;
        this.feed_name = process.env.feed_name;
        this.feed_source_url = process.env.feed_source_url;
        this.download_folder_name = process.env.download_path;
        this.nexus_url = process.env.nexus_url;
        this.repository_name = process.env.repository_name;
        this.package_type = process.env.package_type;
        this.migration_type = process.env.migration_type;
        this.xlsx_file_path = process.env.xlsx_file_path;

        if (process.env.upload_limit_size_in_mb !== undefined) {
            this.upload_limit_size_in_mb = parseFloat(process.env.upload_limit_size_in_mb);
        } else {
            this.upload_limit_size_in_mb = undefined;
        }

        if (this.migration_type == this.batch_migration) {
            
            if(this.azure_username === undefined || this.azure_token === undefined || this.feed_name === undefined
                || this.feed_source_url === undefined || this.download_folder_name === undefined || this.nexus_url === undefined
                || this.repository_name === undefined || this.package_type === undefined) {
                    let error_message = "As variáveis de ambiente azure_username, azure_token, feed_name, feed_source_url, " + 
                    "download_path, nexus_url, repository_name e package_type são obrigatórias! Favor revisar se todas as variáveis foram definidas!";
                    throw new Error(error_message);
               }

        } else if (this.migration_type == this.xlsx_migration) {
            
            if(this.azure_username === undefined || this.azure_token === undefined || this.download_folder_name === undefined || this.nexus_url === undefined
                || this.xlsx_file_path === undefined) {
                    let error_message = "As variáveis de ambiente azure_username, azure_token, feed_name, feed_source_url, " + 
                    "download_path, nexus_url e xlsx_file_path são obrigatórias! Favor revisar se todas as variáveis foram definidas!";
                    throw new Error(error_message);
               }

        } else {

            let error_message = `O tipo de migração informado é inválido! migration_type informado: ${this.migration_type}`;
            throw new Error(error_message);

        }

    }

    async importPackagesFromNexus() {
        if (this.migration_type == this.batch_migration) {
            this.initializeBatchMigration();
        } else if (this.migration_type == this.xlsx_migration) {
            this.initializeXlsxMigration();
        }
    }

    async initializeBatchMigration() {
        const MAVEN_PACKAGE = "maven";
        const NUGET_PACKAGE = "nuget";

        if (this.package_type == MAVEN_PACKAGE){
            let mavenImporter: NexusMavenImporter = new NexusMavenImporter(this.azure_username, this.download_folder_name,
                this.feed_name, this.feed_source_url, this.nexus_url, this.repository_name, this.upload_limit_size_in_mb);
            mavenImporter.importPackagesFromNexus();
        } else if (this.package_type == NUGET_PACKAGE) {
            let nugetImporter: NexusNugetImporter = new NexusNugetImporter(this.azure_username, this.download_folder_name,
                this.feed_name, this.feed_source_url, this.nexus_url, this.repository_name);
            nugetImporter.importPackagesFromNexus();
        } else {
            this.consoleUtils.printError('Falha no processamento!');
            this.consoleUtils.printError(`Pacotes do tipo ${this.package_type} não são suportados pelo utilitário!`);
            exit(1);
        }
    }

    async initializeXlsxMigration() {
        
        const reader = require('xlsx');
        const file = reader.readFile(this.xlsx_file_path);
        
        const nuget_infos_tab = 'nuget';
        const maven_infos_tab = 'maven';
        const migration_configs_tab = 'migration_configs';

        let migration_configs;

        let nuget_data: any[] = []
        let maven_data: any[] = []
        
        const sheets = file.SheetNames

        for(let i = 0; i < sheets.length; i++) {
            const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]])

            temp.forEach((res: any) => {
                if (file.SheetNames[i] == nuget_infos_tab) {
                    nuget_data.push(res)
                } else if (file.SheetNames[i] == maven_infos_tab) {
                    maven_data.push(res)
                } else if (file.SheetNames[i] == migration_configs_tab) {
                    migration_configs = {
                        nuget_azure_feed_name: res.nuget_azure_feed_name,
                        nuget_azure_feed_url: res.nuget_azure_feed_url,
                        maven_azure_feed_name: res.maven_azure_feed_name,
                        maven_azure_feed_url: res.maven_azure_feed_url
                    };
                }
            })
        }

        if (nuget_data.length > 0) {
            let nugetXlslxImporter: NexusNugetXlsxImporter = new NexusNugetXlsxImporter(this.azure_username, this.download_folder_name,
                this.nexus_url, migration_configs);

            await nugetXlslxImporter.importXlsxPackagesFromNexus(nuget_data);
        }

        if (maven_data.length > 0) {
            let mavenXlslxImporter = new NexusMavenXlsxImporter(this.azure_username, this.download_folder_name, this.nexus_url,
                migration_configs, this.upload_limit_size_in_mb);

            await mavenXlslxImporter.importXlsxPackagesFromNexus(maven_data);
        }     

    }

}