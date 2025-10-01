from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError
from fastapi import HTTPException

# from azure.identity import DefaultAzureCredential
# from os import getenv 
# aUrl = getenv("aUrl")
# credential = DefaultAzureCredential()

# for local dev
aUrl = "http://127.0.0.1:10000/devstoreaccount1"
accountKey = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="


class storage:
    def __init__(self):
        """Initiate storage account connection"""
        # for local dev
        self.service = BlobServiceClient(account_url=aUrl, credential=accountKey)
        # self.service = BlobServiceClient(account_url=aUrl,credential=credential)

    def close(self):
        """Close storage account connection"""
        self.service.close

    # -----------------------------------------------------------
    # -------------------Kontenery-------------------------------
    # -----------------------------------------------------------
    def createContainer(self, container: str):
        """Create container with specified name"""
        # TO DO: add container name validation
        self.service.create_container(container)

    def deleteContainer(self, dstContainer: str):
        """Delete container"""
        self.service.delete_container(dstContainer)

    # --------------------------------------------------------------
    # ------------------------Bloby---------------------------------
    # --------------------------------------------------------------
    def uploudBlockBlob(self, dstContainer: str, data, filename: str):
        """Upload file to blob container"""
        container = self.service.get_container_client(dstContainer)
        try:
            container.upload_blob(name=filename, data=data, overwrite=True)
        except ResourceNotFoundError:
            return "file not found"

    def downloadBlob(self, dstContainer: str, filename: str):
        """Download specific file from blob container"""
        container = self.service.get_container_client(dstContainer)
        try:
            blob = container.get_blob_client(filename)
            blob.get_blob_properties()
        except ResourceNotFoundError:
            raise HTTPException(status_code=404, detail="File not found")
        return blob.download_blob()

    def listBlobs(self, dstContainer: str):
        """Get names of all blobs in specific blob container"""
        container = self.service.get_container_client(dstContainer)
        return container.list_blobs()

    def deleteBlockBlob(self, dstContainer: str, filename):
        """Delete specific blob inside a container"""
        container = self.service.get_container_client(dstContainer)
        try:
            container.delete_blob(filename)
        except ResourceNotFoundError:
            raise HTTPException(status_code=404, detail="File not found")


# ----------------------------------------------------------------------------
# ---------------------------HELPERS------------------------------------------
# ----------------------------------------------------------------------------
"""
# "rb" - read binary data, because everything is just a binary data
with open (file, "rb") as movie:
    test.upload_blob(name=file, data=movie, overwrite=True)
*
#for i in test.list_blob_names():
#    test.delete_blob(i)
"""
