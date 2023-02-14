# Informações prévias
* Este projeto inicialmente foi criado para ser utilizado em um cliente em que atuei. O mesmo foi limpo de qualquer referência ao cliente em questão de forma que possa ser usado em meu portifólio de projetos do GitHub. Devido a isso o mesmo não possui um grande histórico, pois isso implicaria na exposição de informações do cliente.

* O objetivo do mesmo é ser utilizado para migrar pacotes existentes na plataforma Nexus em direção ao Azure Artifacts.


# Índice
* [Visão Geral](#visão-geral)

* [Pré-requisitos](#pré-requisitos)

* [Permissões necessárias para o token de autenticação](#permissões-necessárias-para-o-token-de-autenticação)

* [Configurações](#configurações)

  * [Migração em lote para pacotes Maven ou Nuget](#migração-em-lote-para-pacotes-maven-ou-nuget)

  * [Migração de pacotes Maven e Nuget via planilha](#migração-de-pacotes-maven-e-nuget-via-planilha)

  * [Configurando a planilha para migração de pacotes específicos Maven e Nuget](#configurando-a-planilha-para-migração-de-pacotes-específicos-maven-e-nuget)

    * [Informações para configuração da aba nuget](#informações-para-configuração-da-aba-nuget)

    * [Informações para configuração da aba Maven](#informações-para-configuração-da-aba-maven)

    * [Informações para configuração da aba migration_configs](#informações-para-configuração-da-aba-migration_configs)

* [Build da aplicação para execução em container](#build-da-aplicação-para-execução-em-container)

* [Executando a aplicação](#executando-a-aplicação)

    * [Execução local](#execução-local)

    * [Execução em container](#execução-em-container)

* [Pontos de atenção](#pontos-de-atenção)


# Visão Geral

Esta ferramenta tem o objetivo de automatizar a migração de pacotes do nexus para o Azure Artifacts.
Atualmente foi implementada apenas a migração de pacotes .NET e pacotes Maven.

É possível realizar a migração em lote, sendo possível realizar apenas um tipo de migração por vez ( .NET ou Maven ).

Também é possível realizar a migração de pacotes específicos via planilha. ( .NET e Maven simultâneamente )


# Pré-requisitos

* Node 16

* Possuir um Personal Access Token do Azure DevOps

* Conexão com a VPN/Nexus ativa

* Possuir um feed do Azure Artifacts criado

* Possuir o Maven e/ou Nuget instalado.

* Possuir o NodeJS instalado.

* Possuir o CLI do Azure instalado (Caso vá consumir a imagem Docker já pronta da aplicação a partir do Azure Container Registry).
  

# Permissões necessárias para o token de autenticação

Para executar a aplicação é necessária a criação de um token, e este token deve ter as seguintes permissões:

* Build: Read & Execute

* Packaging: Read & Write

  

# Configurações

Para configurar a aplicação basta criar um arquivo .env 

Outra alternativa é exportar todas as variáveis que estariam no arquivo .env como variáveis de ambiente

## Migração em lote para pacotes Maven ou Nuget

Crie seu arquivo **.env** baseado no arquivo **.env.maven.example** (para importação em lote Maven) ou **.env.nuget.example** (para importação em lote Nuget) e preencha adequadamente os parâmetros abaixo:

* **azure_token**: Informe neste parâmetro seu token de acesso ao Azure DevOps

* **azure_username**: Informe neste parâmetros seu usuário no Azure DevOps. ( Exemplo: T000000 )

* **download_path**: Este parâmetro informa a aplicação o nome da pasta que irá armazenar os pacotes baixados pela aplicação durante a migração. Recomendamos utilizar o valor **./packages** neste parâmetro.

* **feed_name**: Informa o nome do Feed do Azure Artifacts que irá receber os pacotes migrados.

* **feed_source_url**: Informe a url do feed a ser utilizado no Azure Artifacts.

* **nexus_url**: Informe a url do Nexus no formato **http://nexus-url:nexus-port**. Exemplo: **http://my.nexus.com.br:8080**.

* **repository_name**: Este parâmetro deve ser preenchido com o nome do Feed do Nexus que será migrado para o Azure Artifacts. Exemplo: **maven-release**.

* **package_type**: Informa o tipo de pacote que será migrado. Os valores aceitos são **maven** e **nuget**

* **migration_type**: Informa o tipo de migração a ser realizada. Por padrão uma migração em lote deve ser realizada com este parâmetro definido com o valor **batch**

* **upload_limit_size_in_mb**: Parâmetro disponível apenas para importação de pacotes Maven. O mesmo informa a aplicação o limite máximo de Megabytes de um binário Java para que o mesmo possa ser enviado para o Azure Artifacts. O valor deve ser informado como um decimal. Exemplo: 10. Que seria referente a 10 Megabytes.

## Migração de pacotes Maven e Nuget via planilha

**Ponto de atenção**: Caso esteja realização migração em lote sem o uso de planlha pode ignorar esta etapa de configuração.

Crie seu arquivo **.env** baseado no arquivo **.env.example.xlsx_migration** e preencha adequadamente os parâmetros abaixo:

* **azure_token**: Informe neste parâmetro seu token de acesso ao Azure DevOps

* **azure_username**: Informe neste parâmetros seu usuário no Azure DevOps. ( Exemplo: T000000 )

* **download_path**: Este parâmetro informa a aplicação o nome da pasta que irá armazenar os pacotes baixados pela aplicação durante a migração. Recomendamos utilizar o valor **./packages** neste parâmetro.

* **nexus_url**: Informe a url do Nexus no formato **http://nexus-url:nexus-port**. Exemplo: **http://my.nexus.com.br:8080**.

* **migration_type**: Informa o tipo de migração a ser realizada. Por padrão uma migração em a partir de planilha deve ser realizada com este parâmetro definido com o valor **xlsx**

* **xlsx_file_path**: Informa a aplicação o Path do arquivo de planilha **.xlsx** que irá conter as informações dos pacotes específicos a serem migrados. Utilize o arquivo [MigrationInfo.xlsx](./xlsx_config/MigrationInfo.xlsx) como base para inserir suas informações de migração. Por padrão este arquivo deve ser armazenado na pasta **xlsx_config**. Com isso o valor recomendado para este parâmetro é o valor **./xlsx_config/MigrationInfo.xlsx**

* **upload_limit_size_in_mb**: Parâmetro disponível apenas para importação de pacotes Maven. O mesmo informa a aplicação o limite máximo de Megabytes de um binário Java para que o mesmo possa ser enviado para o Azure Artifacts. O valor deve ser informado como um decimal. Exemplo: 10. Que seria referente a 10 Megabytes.

## Configurando a planilha para migração de pacotes específicos Maven e Nuget

**Ponto de Atenção 1**: Esta configuração deve ser realizada em conjuto com a configuração do tópico anterior ( Migração de pacotes Maven e Nuget ( .NET ) via planilha ), caso contrário a migração não irá funcionar.

**Ponto de atenção 2**: Caso esteja realização migração em lote sem o uso de planlha pode ignorar esta etapa de configuração.

Utilize o arquivo [MigrationInfo.xlsx](./MigrationInfo.xlsx) como base para inserir suas informações de migração.

A planilha possui 3 abas principais, sendo elas:
* **nuget**: Possui informações dos pacotes Nuget ( .NET ) que serão migrados.

* **maven**: Possui informações dos pacotes Maven que serão migrados.

* **migration_configs**: Possui informações referente aos feed a serem utilizados no Azure DevOps para fazer o download de pacotes Maven e Nuget ( .NET )

**Observação importante**: Vale ressaltar que as abas nuget e maven podem ser preenchidas com mais de uma linha. Onde cada linha representa um pacote diferente a ser migrado.

### Informações para configuração da aba nuget

* **nexus_repository**: Este parâmetro deve ser preenchido com o nome do Feed do Nexus que contém pacotes Nuget a ser migrado para o Azure Artifacts. Exemplo: **nuget**.

* **package_name**: Nome do pacote Nuget a ser migrado. Exemplo: **Pacote.Exemplo**

* **package_version**: Versão do pacote a ser migrada. Exemplo: **1.0.0**

### Informações para configuração da aba Maven

* **nexus_repository**: Este parâmetro deve ser preenchido com o nome do Feed do Nexus que contém pacotes Nuget a ser migrado para o Azure Artifacts. Exemplo: **maven-release**.

* **group_id**: Este parâmetro deve ser preenchido com o groupId do pacote a ser migrado. Exemplo: **br.com**

* **artifact_id**: Este parâmetro deve ser preenchido com o ArtifactId do projeto. Exemplo: **PacoteDeExemplo**

* **package_version**: Versão do pacote a ser migrada. Exemplo: **1.0.0**

### Informações para configuração da aba migration_configs

Esta aba normalmente não precisa ser alterada pois a planilha base já vem com ela preenchida.

Para fins de conhecimento estes são os parâmetros dessa aba:
* **nuget_azure_feed_name**: Este parâmetro contém o nome do Feed do Azure Artifacts que irá receber os pacotes Nuget a serem migrados.

* **nuget_azure_feed_url**: Informe a url do feed a ser utilizado no Azure Artifacts para pacote Nuget. Exemplo: **https://pkgs.dev.azure.com/organization-name/_packaging/feed-name/nuget/v3/index.json**

* **maven_azure_feed_name**: Este parâmetro contém o nome do Feed do Azure Artifacts que irá receber os pacotes Maven a serem migrados.

* **maven_azure_feed_url**: Informe a url do feed a ser utilizado no Azure Artifacts para pacote Maven. Exemplo: **https://pkgs.dev.azure.com/organization-name/_packaging/feed-name/maven/v1**


# Build da aplicação para execução em container
Para a execução em container é necessário realizar o Build de 2 imagens Docker.

A primeira servirá de imagem base para a aplicação.

Com isso execute o seguinte comando para criar a imagem Docker base:
```sh
docker build -t base-migrate-nexus-to-artifacts:alpine -f Dockerfile-Base-Image .
```

Após isso execute o seguinte comando para realizar o build da imagem Docker da aplicação:
```sh
docker build -t migrate-nexus-to-azure-artifacts:latest .
```

# Executando a aplicação
É possível executar a aplicação localmente e via container Docker.

## Execução local
Para executar a aplicação localmente basta executar o seguinte comando:
```sh
npm install
npm start
```

Contanto que os passos de configuração tenham sido realizados corretamente a aplicação deve executar normalmente.

## Execução em container
Para executar a aplicação em container basta executar um dos seguintes comandos lembrando de configurar adequadamente as variáveis de ambiente antes da execução do mesmo:
```sh
# Para realizar a migração em lote de pacotes .NET
docker run --rm -it -d \ 
-e azure_token="MY_PERSONAL_ACCESS_TOKEN" \ 
-e azure_username="T000000" \ 
-e download_path="./packages" \ 
-e feed_name="feed-name" \ 
-e feed_source_url="https://pkgs.dev.azure.com/organization-name/_packaging/feed-name/nuget/v3/index.json" \ 
-e nexus_url="http://nexus-url:nexus-port" \ 
-e repository_name="nexus-repository-name" \ 
-e package_type="nuget" \ 
-e migration_type="batch" \
--network host \ 
--name NugetBatchMigrationToAzureArtifacts migrate-nexus-to-azure-artifacts:latest


# Para realizar a migração em lote de pacotes Maven
docker run --rm -it -d \ 
-e azure_token="MY_PERSONAL_ACCESS_TOKEN" \ 
-e azure_username="T000000" \ 
-e download_path="./packages" \ 
-e feed_name="feed-name" \ 
-e feed_source_url="https://pkgs.dev.azure.com/organization-name/_packaging/feed-name/maven/v1" \ 
-e nexus_url="http://nexus-url:nexus-port" \ 
-e repository_name="maven-repository-name" \ 
-e package_type="maven" \ 
-e migration_type="batch" \
-e upload_limit_size_in_mb="20" \ 
--network host \ 
--name MavenBatchMigrationToAzureArtifacts migrate-nexus-to-azure-artifacts:latest
```

**Observações importantes**: 
* As variáveis de ambiente **azure_token** e **azure_username** precisam ser definidas corretamente no comando que será executado.
Nos 2 comandos acima tanto o usuário quanto o token são ficticios, cabe a você configurá-los.

* Caso tenha buildado a aplicação localmente não é necessário se autenticar no Azure Container Registry para executar os comandos.


# Pontos de atenção

* Migrações em lote de pacotes Nuget ( .NET ) são mais rápidas. Dependendo do volume de informações cerca de 1 hora é suficiente para realizar a migração.
* Migrações em lote de pacotes Maven podem demorar bastante caso o feed do nexus não possua apenas bibliotecas. Dependendo do volume de pacotes a migração pode demorar em média 8 horas ou mais. Além de consumir mais de 500GB de espaço em disco!

