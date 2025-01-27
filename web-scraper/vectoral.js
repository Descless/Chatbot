// import pinecone from "@pinecone-database/pinecone";
// import { Configuration, OpenAIApi } from "openai";

import axios from "axios";
import pkg from "@pinecone-database/pinecone";
import dotenv from 'dotenv';

dotenv.config();

const HuggingfaceAPI = process.env.HUGGING_FACE_API;

console.log(HuggingfaceAPI)

const { Pinecone:PineconeClient } = pkg;
async function getEmbeddings(text) {
    const model = "sentence-transformers/bert-base-nli-mean-tokens"; // Model adı
    const apiKey = HuggingfaceAPI;
    
    try {
        const response = await axios.post(
           ` https://api-inference.huggingface.co/models/${model}`,
           
            {
                inputs: text, // Liste formatında metin veya tek bir string
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            }
        );

        if (response.data.error) {
            console.error("API Error:", response.data.error);
            return null;
        }

        return response.data; // Embedding sonuçları
    } catch (error) {
        console.error("Error getting embeddings:", error.response?.data || error.message);
        return null;
    }

}

async function retryGetEmbeddings(text, retries = 5, delay = 10000) {
    for (let i = 0; i < retries; i++) {
        const embeddings = await getEmbeddings(text);
        if (embeddings) return embeddings;
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, delay));
    }
    console.error("Model yüklenemedi veya hata devam ediyor.");
    return null;
}


// Örnek kullanım
(async () => {
    const text = {
        source_sentence: "This is the source sentence.",
        ıii: ["This is the first sentence to compare.", "Here is another one."]
    };
    
    const embeddings = await retryGetEmbeddings(text);

    if (embeddings) {
        console.log("Embeddings başarıyla alındı:", embeddings);
    } else {
        console.log("Embedding alınamadı.");
    }
})();




// Pinecone Client Initialization
const pineconeClient = new PineconeClient({
  controllerHostUrl: "https://us-east-1-aws.pinecone.io", // Sizin Pinecone ortamınız
  apiKey: "pcsk_GYoQz_AuNBvWxx5eSbmKueXEKAhumZQ3A2gNKcf7eyD82bWsZdAXwTsZwpfoXJavzB6HC",
});

const index = pineconeClient.Index("ai-bot"); // Pinecone'daki indeks adı

export async function saveToVectorDatabase(data) {
  for (const item of data) {
      const { url, content } = item;

      // Embedding al
      const embedding = await retryGetEmbeddings(content);

      if (!embedding) {
          console.error(`Embedding alınamadı: ${url}`);
          continue; // Eğer embedding alınamazsa sıradaki öğeye geç
      }

      // Pinecone'a kaydet
      await index.upsert({
          vectors: [
              {
                  id: url, // URL'yi ID olarak kullanabilirsiniz
                  values: embedding[0], // Embedding değerlerini ekleyin
                  metadata: { url, content },
              },
          ],
      });

      console.log(`Vektör veritabanına kaydedildi: ${url}`);
  }
}

export async function queryVectorDatabase(query) {
  // OpenAI veya Hugging Face ile embedding üret
  const embedding = await retryGetEmbeddings(query); // Hugging Face
  // const response = await openai.createEmbedding({ model: "text-embedding-ada-002", input: query });
  // const embedding = response.data.data[0].embedding; // OpenAI için

  if (!embedding) {
    console.error("Embedding üretilemedi.");
    return [];
  }

  // Pinecone üzerinde sorgulama yap
  const searchResults = await index.query({
    topK: 5, // En alakalı 5 sonucu getir
    vector: embedding,
    includeMetadata: true,
  });

  // Sonuçları döndür
  return searchResults.matches.map((match) => match.metadata);
}


  


