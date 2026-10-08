from fastapi import FastAPI

app = FastAPI(title="Library Management System API")


@app.get("/")
def root():
    return {"message": "Library Management System API"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}