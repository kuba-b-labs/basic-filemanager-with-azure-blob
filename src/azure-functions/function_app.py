import azure.functions as func
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient,generate_blob_sas, BlobSasPermissions
import datetime
#from dotenv import load_dotenv
from os import getenv
import logging

app = func.FunctionApp()

# for local dev
# load_dotenv()
# azuriteAccountKey = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="

@app.function_name("basic")
@app.route(route="download", auth_level= func.AuthLevel.ANONYMOUS)
def url_maker(req: func.HttpRequest) -> func.HttpResponse:
    logger = logging.getLogger()
    console_handler = logging.StreamHandler()
    logging.basicConfig(
        format="%(asctime)s %(levelname)s %(message)s",
        level=logging.INFO,
        handlers=[console_handler]
    ) 
    accountUrl = getenv("ACCOUNT_URL")
    containerName = req.params.get('container')
    blobName = req.params.get('blob')
    if containerName and blobName:
        try:
            # for azure deployment
            credentials = DefaultAzureCredential()
            storageAccountConnection = BlobServiceClient(account_url=accountUrl, credential= credentials )
            # for local dev
            # storageAccountConnection = BlobServiceClient(account_url=accountUrl, credential=azuriteAccountKey)
            specificBlob = storageAccountConnection.get_blob_client(container=containerName, blob=blobName)
            specificBlob.get_blob_properties()
            storageAccountConnection.account_name
        except Exception as e:
            logger.info(msg=e)
            return func.HttpResponse("No container or blob found")
        
        startTime = datetime.datetime.now(datetime.timezone.utc)
        expiryTime = startTime + datetime.timedelta(hours=1)
        udk = storageAccountConnection.get_user_delegation_key(
            key_start_time=startTime,
            key_expiry_time= expiryTime
        )
        try:
            blobDownloadUrl = generate_blob_sas(
                account_name= storageAccountConnection.account_name,
                container_name= containerName,
                blob_name=blobName,
                permission=BlobSasPermissions(read=True),
                expiry=expiryTime,
                # local dev
                # account_key=accountKey
                user_delegation_key=udk
            )
        except Exception as e:
            logger.info(msg=e)
        return func.HttpResponse(f"{specificBlob.url}?{blobDownloadUrl}", status_code=200)
    return func.HttpResponse("No container or blob specified")