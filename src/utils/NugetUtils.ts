import { Utils } from './Utils';

export class NugetUtils {

    private utils: Utils = new Utils();
    private nuget_cli;
    private azure_token_variable;


    constructor() {
        if (process.platform === "win32") {
            this.nuget_cli = 'nuget.exe';
            this.azure_token_variable = '%azure_token%';
        } else {
            this.azure_token_variable = '$azure_token';

            if (process.env.NUGET_PATH === undefined) {
                this.nuget_cli = 'nuget';
            } else {
                this.nuget_cli = `mono ${process.env.NUGET_PATH}`;
            }
        }
    }



    public async addNugetSourceInNugetConfig(feed_name: string, feed_source_url: string, azure_username: string) {
        let add_source_command = `${this.nuget_cli} sources add -name ${feed_name} -source ${feed_source_url} -username ${azure_username} -password ${this.azure_token_variable}`;
        await this.utils.executeCommand(add_source_command);
    }

    public async publishPackageInAzureArtifacts(feed_name: string, file_path: string) {
        let push_package_command= `${this.nuget_cli} push -Source "${feed_name}" -SkipDuplicate -ApiKey az ${file_path}`;
        await this.utils.executeCommand(push_package_command);
    }

}