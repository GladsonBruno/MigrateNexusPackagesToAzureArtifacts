import * as Fs from 'fs';
import * as Path from 'path';
const util = require('util');
const exec = util.promisify(require('child_process').exec);

export class Utils {
    async executeCommand(command: string) {
        let command_result = await exec(command);
        console.log(command_result.stdout);
        console.log(command_result.stderr);
    }

    async deleteFile(file_path: string) {
        Fs.unlinkSync(file_path);
    }

    public async verifyIfFolderDownloadExists(download_folder_name: string) {
        const path = Path.resolve(__dirname, '../../', download_folder_name);
        console.log(path)
        if (!Fs.existsSync(path)){
          Fs.mkdirSync(path);
        }
    }

}