import axios from 'axios';
import * as Fs from 'fs';
import * as Path from 'path';

export class NugetFileDownloader {

  private folder_name: string;
  private file_name: string;
  private download_url: string;

  constructor(folder_name: string, file_name: string, download_url: string) {
    this.folder_name = folder_name;
    this.file_name = file_name;
    this.download_url = download_url;
  }

  async downloadFile () {  
    const url = this.download_url;
    const path = Path.resolve(__dirname, `../../${this.folder_name}`, this.file_name)
    const writer = Fs.createWriteStream(path)
    
    console.log(`Iniciando download do pacote ${this.file_name}`)

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