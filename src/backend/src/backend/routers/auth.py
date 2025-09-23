from fastapi import APIRouter, Depends, HTTPException
from typing import Annotated
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jwt import decode, encode, ExpiredSignatureError
from dotenv import load_dotenv
from os import getenv
from datetime import datetime, timedelta, timezone

load_dotenv()

privateKey = getenv("SECRET")
issuer = getenv("ISSUER")

authRouter = APIRouter(prefix="/auth")

oauth2Scheme = OAuth2PasswordBearer(tokenUrl="token")

algorithm = "HS256"


def genPassHash(password: str):
    encrypt = CryptContext(schemes="argon2", default="argon2")
    return encrypt.hash(password)


def checkPassHash(password: str, dbHash: str):
    decrypt = CryptContext()
    return decrypt.verify(secret=password, hash=dbHash)


user1 = {"id": "1", "username": "Jan", "password": "jan123"}


def authUser(username: str, password: str):
    if user1["username"] == username and user1["password"] == password:
        return True
    return False


def genToken(userId: int):
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=1)
    token = {
        "sub": userId,
        "iss": "k-labs",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    token = encode(token, privateKey, algorithm)
    return token


def validateToken(token: dict):
    try:
        decodedToken = decode(token, privateKey, algorithm)
    except ExpiredSignatureError:
        return False
    if decodedToken["iss"] == "" or decodedToken["iss"] != "k-labs":
        return False
    return True


@authRouter.post("/token")
async def getToken(formData: Annotated[OAuth2PasswordRequestForm, Depends()]):
    if authUser(formData.username, formData.password):
        return {"access_token": genToken(user1["id"]), "token_type": "bearer"}
    raise HTTPException(
        status_code=401,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


@authRouter.get("/user")
async def getUser(token: Annotated[str, Depends(oauth2Scheme)]):
    print(token)
    # check = validateToken( token )
    # if check:
    #    return user1
    return "Validation of token not passed"
