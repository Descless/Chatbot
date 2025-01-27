from sentence_transformers import SentenceTransformer
from PyPDF2 import PdfReader
from pinecone import Pinecone, ServerlessSpec
import time
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), "../.env")))

pineconeAPI = os.getenv("PINECONE_API")
pineconeEnv = os.getenv("PINECONE_ENV")
pineconeIndex = os.getenv("PINECONE_INDEX")



# Dosya yolu
pdf_path = os.path.abspath("../static/pdf/services.pdf")
# Pinecone ortamını başlat
pinecone = Pinecone(
    api_key=pineconeAPI,
    spec=ServerlessSpec(
        cloud="aws",
        region=pineconeEnv
    )
)

# Pinecone index oluştur veya bağlan
index_name = pineconeIndex
if index_name not in pinecone.list_indexes().names():
    pinecone.create_index(
        name=index_name,
        dimension=384,  # SBERT boyutu
        metric="cosine",  # Benzerlik ölçütü
        spec=ServerlessSpec(
            cloud="aws",
            region=pineconeEnv
        )
    )
index = pinecone.Index(index_name)

# Sentence-BERT modeli
try:
    print("SBERT modeli yükleniyor...")
    sbert_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    print("SBERT modeli başarıyla yüklendi.")
except Exception as e:
    print(f"SBERT modeli yüklenirken hata oluştu: {e}")
    exit()

# PDF'den metin çıkarma
def extract_text_from_pdf(pdf_path):
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
        if not text.strip():
            print("PDF'den metin çıkarılamadı. PDF'yi kontrol edin.")
            exit()
        print("PDF metni başarıyla çıkarıldı.")
        return text.split("\n")  # Satır satır böl
    except Exception as e:
        print(f"PDF işlenirken hata oluştu: {e}")
        exit()

# Pinecone'a vektörleri ve metadata'yı yükleme
def build_vector_database_pinecone(text_list, batch_size=32):
    try:
        embeddings = sbert_model.encode(text_list, convert_to_numpy=True)
        print("Vektörler başarıyla oluşturuldu.")
        upsert_data = []
        
        for i, (embedding, text) in enumerate(zip(embeddings, text_list)):
            metadata = {"text": text.encode('utf-8').decode('utf-8')}  # Metadata olarak metni ekle
            upsert_data.append((str(i), embedding, metadata))
            
            # Her batch_size kadar veriyi yükle
            if len(upsert_data) >= batch_size:
                index.upsert(upsert_data)
                print(f"{len(upsert_data)} vektör yüklendi.")
                upsert_data = []
        
        # Kalan verileri yükle
        if upsert_data:
            index.upsert(upsert_data)
            print(f"{len(upsert_data)} kalan vektör yüklendi.")
            
    except Exception as e:
        print(f"Pinecone'a yükleme sırasında hata oluştu: {e}")

def chatbot():
    print("PDF'den metin çıkarılıyor...")
    text_list = extract_text_from_pdf(pdf_path)
    
    # Eğer metin boşsa işlemi durdur
    if not text_list or len(text_list) == 0:
        print("PDF'den metin çıkarılamadı. İşlem sonlandırılıyor.")
        return

    print(f"{len(text_list)} satır metin bulundu. Pinecone'a yükleniyor...")
    build_vector_database_pinecone(text_list)

if __name__ == "__main__":
    start_time = time.time()
    chatbot()
    print(f"İşlem tamamlandı. Süre: {time.time() - start_time:.2f} saniye")
