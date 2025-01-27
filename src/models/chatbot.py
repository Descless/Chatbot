from sentence_transformers import SentenceTransformer
import pinecone
from transformers import AutoTokenizer, AutoModelForQuestionAnswering
import torch
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), "../.env")))

pineconeAPI = os.getenv("PINECONE_API")
pineconeEnv = os.getenv("PINECONE_ENV")
pineconeIndex = os.getenv("PINECONE_INDEX")

print(pineconeAPI)

pc = pinecone.Pinecone(api_key=pineconeAPI, environment=pineconeEnv)

# Pinecone bağlan
index_name = pineconeIndex
index = pc.Index(index_name)

# Sentence-BERT
sbert_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

model_name = "deepset/bert-base-cased-squad2"  # Soru-Cevap için özel eğitilmiş BERT
tokenizer = AutoTokenizer.from_pretrained(model_name)
bert_model = AutoModelForQuestionAnswering.from_pretrained(model_name)

# Hugging Face GPT modeli ve tokenizer
# model_name = "gpt2"  # Alternatif: "EleutherAI/gpt-neo-1.3B" (daha büyük modeller için)
# tokenizer = AutoTokenizer.from_pretrained(model_name)
# chat_model = AutoModelForCausalLM.from_pretrained(model_name)

# Embedleme
def embed_text(text):
    # sorguyu vektöre dönüştür
    clean_text = text.encode('utf-8').decode('utf-8')
    return sbert_model.encode([clean_text], convert_to_numpy=True)

# sorguya en yakın bağlamları Pinecone'dan çek
def find_relevant_texts_pinecone(query, top_k=3):
    # Kullanıcı sorgusunu embed et
    query_embedding = embed_text(query)
    
    # Pinecone'dan veri çek
    results = index.query(vector=query_embedding[0].tolist(), top_k=top_k, include_metadata=True)
    relevant_texts = []
    
    # veriyi kontrol et
    for match in results['matches']:
        # metadatayı al
        if 'metadata' in match:
            relevant_texts.append(match['metadata'].get('text', ''))
        else:
            relevant_texts.append(match.get('id', 'ID bulunamadı'))
    
    return relevant_texts


def generate_response_with_bert(context, query):

    inputs = tokenizer.encode_plus(query, context, return_tensors="pt", max_length=512, truncation=True)
 
    outputs = bert_model(**inputs)
    answer_start = torch.argmax(outputs.start_logits)  
    answer_end = torch.argmax(outputs.end_logits) + 1 
    
    answer = tokenizer.decode(inputs["input_ids"][0][answer_start:answer_end], skip_special_tokens=True)
    return answer if answer.strip() else "Bu soruya uygun bir yanıt bulunamadı."

def get_chatbot_response(user_query):
    relevant_texts = find_relevant_texts_pinecone(user_query)
    context = "\n".join(relevant_texts)
    if not context.strip():
        return "Maalesef bu konuyla ilgili bağlam bulamadım."
    
    # BERT modeli ile yanıt üret
    response = generate_response_with_bert(context, user_query)
    return response
    
    # # GPT modeli ile yanıt üret
    # response = generate_response_with_gpt(context, user_query)
    # return response