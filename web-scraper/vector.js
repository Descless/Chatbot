import Pdf from 'pdf-parse';
import fs from 'fs';
import * as tf from '@tensorflow/tfjs-node';
//import * as use from '@tensorflow-models/universal-sentence-encoder';

async function loadModel() {
  try {
    console.log('Loading model...');
    const model = await use.load();
    console.log('Model loaded successfully');
    return model;
  } catch (error) {
    console.error('An error occurred while loading the model:', error);
  }
} 

loadModel();

// 1. Extract text from PDF
async function extractTextFromPdf(pdfPath) {
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const data = await Pdf(pdfBuffer);
    return data.text; // Return text from the PDF
  } catch (error) {
    console.error('Error reading or parsing PDF:', error);
    throw error;
  }
}

// 2. Split text into chunks
function splitTextIntoChunks(text, maxChunkSize = 500) {
  const chunks = [];
  let currentChunk = '';
  const sentences = text.split('. '); // Split text into sentences

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += sentence + '. ';
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// 3. Generate embeddings
async function createEmbeddings(chunks) {
  const modelPath = 'https://tfhub.dev/google/universal-sentence-encoder/4';
  console.log('Loading model...');
  const model = await tf.loadGraphModel(modelPath, { fromTFHub: true });

  const embeddings = [];
  for (const chunk of chunks) {
    console.log(`Processing chunk: ${chunk}`);
    const inputTensor = tf.tensor([chunk]); // Create input tensor
    const output = await model.executeAsync(inputTensor); // Get embeddings
    embeddings.push(output.arraySync()[0]); // Add embedding to the list
    inputTensor.dispose();
    output.dispose();
  }

  return embeddings;
}

// 4. Main function
(async () => {
  try {
    const pdfPath = 'solutions.pdf'; // Path to your PDF file

    // Extract text and split into chunks
    const text = await extractTextFromPdf(pdfPath);
    const chunks = splitTextIntoChunks(text);

    console.log(`Extracted ${chunks.length} chunks from the PDF.`);

    // Generate embeddings
    const embeddings = await createEmbeddings(chunks);

    console.log(`Generated ${embeddings.length} embeddings.`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();
