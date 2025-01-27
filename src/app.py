from flask import Flask, request, jsonify, render_template
from models.chatbot import get_chatbot_response

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

# Chatbot API
@app.route('/chatbot', methods=['POST'])
def chatbot_api():

    user_query = request.form.get('input')
    
    if not user_query:
        return jsonify({"error": "Soru sağlanmadı"}), 400

    botResponse = get_chatbot_response(user_query)

    print(botResponse)

    return render_template('index.html',query=user_query, response=botResponse )


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
