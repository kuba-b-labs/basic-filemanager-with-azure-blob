from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from mimetypes import guess_type
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .routers.jwt1 import tokenValidation
from .storage.blob import storage
from .database.database import postgres, checkList, checkWrite
from typing import Annotated

saccount = "saccount1"
security = HTTPBearer()
# Testing gha
def authUser(credentials: HTTPAuthorizationCredentials = Depends(security)):
    upn = tokenValidation(credentials.credentials)
    return upn


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------Kontenery-------------------------
@app.post("/container/create/{containerName}")
async def newContainer(containerName: str, username: Annotated[str, Depends(authUser)]):
    async with postgres() as db:
        containerExist = await db.getContainer(containerName)
        uId = await db.getUser(username)
        if containerExist:
            raise HTTPException(status_code=409, detail="Kontener juz istnieje")
        if not uId:
            uId = await db.addUser(username)
        cId = await db.addContainer(containerName, saccount)
        await db.addPermissions(cId, uId, "owner")
        storageConnection = storage()
        storageConnection.createContainer(containerName)
        return f"Container {containerName} Created"


@app.get("/containers")
async def listContainers(username: Annotated[str, Depends(authUser)]):
    async with postgres() as db:
        uId = await db.getUser(username)
        containers = await db.getContainers(uId)
        return containers


@app.delete("/delete/{containerName}")
async def rmContainer(containerName: str, username: Annotated[str, Depends(authUser)]):
    async with postgres() as db:
        containerExist = await db.getContainer(containerName)
        aclCheck = await db.getACL(containerName, username)
        if not checkWrite(aclCheck):
            raise HTTPException(status_code=403, detail="Brak uprawnień")
        if not containerExist:
            raise HTTPException(status_code=404, detail="Kontener nie istnieje")
        await db.rmContainer(containerName)
        storageConnection = storage()
        storageConnection.deleteContainer(containerName)


# ------------------Pliki------------------------------
@app.get("/listblobs/{dstContainer}")
async def listBlobs(dstContainer: str, username: Annotated[str, Depends(authUser)]):
    async with postgres() as db:
        acl = await db.getACL(dstContainer, username)
        containerExist = await db.getContainer(dstContainer)
        if not containerExist:
            raise HTTPException(status_code=404, detail="Kontener nie istnieje")
        if not checkList(acl):
            raise HTTPException(status_code=403, detail="Brak uprawnień")
        storageConnection = storage()
        blobs = storageConnection.listBlobs(dstContainer)
        storageConnection.close()
        blobsNames = []
        for i in blobs:
            blobsNames.append(i.name)
        return blobsNames


@app.get("/download/{dstContainer}/{filename}")
async def downloadBlob(
    dstContainer: str, filename: str, username: Annotated[str, Depends(authUser)]
):
    async with postgres() as db:
        containerExist = await db.getContainer(dstContainer)
        acl = await db.getACL(dstContainer, username)
        if not containerExist:
            raise HTTPException(status_code=404, detail="Kontener nie istnieje")
        if not checkList(acl):
            raise HTTPException(status_code=403, detail="Brak uprawnień")
        storageConnection = storage()
        blob = storageConnection.downloadBlob(dstContainer, filename)
        # wypakowanie tuple, bo mimetype zwraca tuple (value1, value2)
        mimeType, encoding = guess_type(filename)
        if mimeType is None:
            mimeType = "application/octet-stream"
        return StreamingResponse(blob.chunks(), media_type=mimeType)


@app.post("/upload/{dstContainer}")
async def uploadBlob(
    dstContainer: str,
    username: Annotated[str, Depends(authUser)],
    entry: UploadFile = File(...),
):
    async with postgres() as db:
        containerExist = await db.getContainer(dstContainer)
        acl = await db.getACL(dstContainer, username)
        if not containerExist:
            raise HTTPException(status_code=404, detail="Kontener nie istnieje")
        if not checkWrite(acl):
            raise HTTPException(status_code=403, detail="Brak uprawnień")
        storageConnection = storage()
        dataToUpload = await entry.read()
        storageConnection.uploudBlockBlob(dstContainer, dataToUpload, entry.filename)
        storageConnection.close()
        return {"status": "file uploaded"}


@app.delete("/delete/{dstContainer}/{filename}")
async def deleteBlob(
    dstContainer: str, filename: str, username: Annotated[str, Depends(authUser)]
):
    async with postgres() as db:
        containerExist = await db.getContainer(dstContainer)
        acl = await db.getACL(dstContainer, username)
        if not containerExist:
            raise HTTPException(status_code=404, detail="Kontener nie istnieje")
        if not checkWrite(acl):
            raise HTTPException(status_code=403, detail="Brak uprawnień")
        storageConnection = storage()
        storageConnection.deleteBlockBlob(dstContainer, filename)
        storageConnection.close()
        return {"status": "Entry successfully deleted"}
