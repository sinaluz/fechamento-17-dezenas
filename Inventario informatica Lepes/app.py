from flask import Flask, render_template, request, redirect

app = Flask(__name__)

equipamentos = []

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        def to_int(value):
            try:
                return int(value)
            except (ValueError, TypeError):
                return 0

        novo = {
            'comodo': request.form.get('comodo', '').strip(),
            'pc': to_int(request.form.get('pc')),
            'notebook': to_int(request.form.get('notebook')),
            'monitor': to_int(request.form.get('monitor')),
            'mouse': to_int(request.form.get('mouse')),
            'teclado': to_int(request.form.get('teclado')),
            'webcam': to_int(request.form.get('webcam')),
            'hd': to_int(request.form.get('hd')),
            'projetor': to_int(request.form.get('projetor'))
        }
        if novo['comodo']:
            equipamentos.append(novo)
        return redirect('/')

    totais = {
        'pc': sum(item['pc'] for item in equipamentos),
        'notebook': sum(item['notebook'] for item in equipamentos),
        'monitor': sum(item['monitor'] for item in equipamentos),
        'mouse': sum(item['mouse'] for item in equipamentos),
        'teclado': sum(item['teclado'] for item in equipamentos),
        'webcam': sum(item['webcam'] for item in equipamentos),
        'hd': sum(item['hd'] for item in equipamentos),
        'projetor': sum(item['projetor'] for item in equipamentos)
    }

    return render_template('index.html', equipamentos=equipamentos, totais=totais)

@app.route('/delete/<int:index>', methods=['POST'])
def delete_item(index):
    if 0 <= index < len(equipamentos):
        equipamentos.pop(index)
    return redirect('/')

if __name__ == '__main__':
    app.run(debug=True)
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)
