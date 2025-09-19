import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

# Initialize the FastAPI app
app = FastAPI(
    title="AYU-Sync API",
    description="API for translating NAMASTE and ICD-11 medical codes.",
    version="1.0.0"
)

# --- CORS (Cross-Origin Resource Sharing) ---
origins = [
    "http://localhost",
    "http://127.0.0.1",
    "null",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory Data Storage ---
medical_data_df = None

# --- Application Startup Event ---
@app.on_event("startup")
async def load_data():
    """
    This function is executed when the FastAPI application starts.
    It reads the CSV data into a pandas DataFrame.
    """
    global medical_data_df
    try:
        # Load the CSV file into a pandas DataFrame.
        medical_data_df = pd.read_csv("sih_data.csv")
        print("Successfully loaded medical data from sih_data.csv")
    except FileNotFoundError:
        print("Error: sih_data.csv not found. Please ensure the file is in the same directory.")
        medical_data_df = pd.DataFrame()


# --- API Endpoints ---
@app.get("/")
async def read_root():
    return {"message": "Welcome to the AYU-Sync API Prototype!"}


@app.get("/lookup", summary="Search Medical Terms", response_model=List[Dict[str, Any]])
async def lookup_term(q: str = Query(..., min_length=1, description="The search query string.")):
    if medical_data_df is None or medical_data_df.empty:
        raise HTTPException(status_code=500, detail="Medical data not loaded.")
    mask = (
        medical_data_df['NAMASTE_Term'].str.contains(q, case=False, na=False) |
        medical_data_df['ICD11_Term'].str.contains(q, case=False, na=False)
    )
    results = medical_data_df[mask]
    return results.to_dict(orient='records')


@app.get("/translate", summary="Translate Medical Code", response_model=Dict[str, Any])
async def translate_code(code: str = Query(..., description="The code to translate (e.g., 'A01' or '1D01').")):
    if medical_data_df is None or medical_data_df.empty:
        raise HTTPException(status_code=500, detail="Medical data not loaded.")

    namaste_match = medical_data_df[medical_data_df['NAMASTE_Code'].str.lower() == code.lower()]
    if not namaste_match.empty:
        result = namaste_match.iloc[0]
        return {
            "input_code": code,
            "input_system": "NAMASTE",
            "translation": {
                "system": "ICD-11",
                "code": result['ICD11_Code'],
                "term": result['ICD11_Term']
            }
        }

    icd11_match = medical_data_df[medical_data_df['ICD11_Code'].str.lower() == code.lower()]
    if not icd11_match.empty:
        result = icd11_match.iloc[0]
        return {
            "input_code": code,
            "input_system": "ICD-11",
            "translation": {
                "system": "NAMASTE",
                "code": result['NAMASTE_Code'],
                "term": result['NAMASTE_Term']
            }
        }

    raise HTTPException(status_code=404, detail=f"Code '{code}' not found in either system.")