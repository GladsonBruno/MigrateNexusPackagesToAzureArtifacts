import axios from 'axios';
import * as Fs from 'fs';
import * as Path from 'path';
const { execSync } = require('child_process');

import { Utils } from '../utils/Utils';

export class MavenFileDownloader {

    private folder_name: string;
    private package_infos: any;
    private repository_name: string;
    private nexus_url: string;
    private utils: Utils = new Utils();

    constructor(folder_name: string, package_infos: any, repository_name: string, nexus_url: string) {
        this.folder_name = folder_name;
        this.package_infos = package_infos;
        this.repository_name = repository_name;
        this.nexus_url = nexus_url;
    }

    async downloadDependencyFile() {
        let nexus_repo_url = `${this.nexus_url}/repository/${this.repository_name}/`;
        let download_path = Path.resolve(__dirname, `../../${this.folder_name}`);
        let settings_xml_path = Path.resolve(__dirname, '../../', 'settings.xml');
        let maven_download_command = `mvn dependency:get -DrepoUrl=${nexus_repo_url} -Dartifact=${this.package_infos.artifact} -Dtransitive=false -Ddest=${download_path}/${this.package_infos.package_name} --settings ${settings_xml_path}`;
        await this.utils.executeCommand(maven_download_command);
    }

    async downloadPomFile () {
        const file_name = this.package_infos.pom_file_name;
        const url = this.package_infos.pom_file_download_url;
        const path = Path.resolve(__dirname, `../../${this.folder_name}`, file_name)
        const writer = Fs.createWriteStream(path)
        
        console.log(`Iniciando download do pacote ${file_name}`)
    
        const response = await axios({
          url,
          method: 'GET',
          responseType: 'stream'
        })
          
        response.data.pipe(writer)
          
        return new Promise((resolve, reject) => {
          writer.on('finish', resolve)
          writer.on('error', reject)
        })
      }

}