import * as Path from 'path';
import * as fs from 'fs';
import { Utils } from './Utils';

export class MavenUtils {

    private utils: Utils = new Utils();

    public async publishPackageInAzureArtifacts(feed_name: string, feed_source_url: string, package_infos: any, dependency_file_path: string, pom_file_path: string) {
        let settings_xml_path = Path.resolve(__dirname, '../../', 'settings.xml');
        let push_package_command = `mvn deploy:deploy-file -Dpackaging="${package_infos.package_type}" -DrepositoryId="${feed_name}" -Durl="${feed_source_url}" -DgroupId="${package_infos.group_id}" -DartifactId="${package_infos.artifact_id}" -Dversion="${package_infos.version}" -Dfile="${dependency_file_path}" -DpomFile="${pom_file_path}" --settings ${settings_xml_path}`;
        await this.utils.executeCommand(push_package_command);
    }

    public async getFilesizeInBytes(dependency_file_path: string) {
        
        let stats = fs.statSync(dependency_file_path)
        let fileSizeInBytes = stats.size;
        let fileSizeInMegabytes = fileSizeInBytes / (1024*1024);

        return fileSizeInMegabytes;

    }

}