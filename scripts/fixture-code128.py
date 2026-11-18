"""Genera tests/fixtures/code128_reportlab.json: símbolos Code128 que produce reportlab
(el generador probado en la Zebra) para todo el catálogo, casos borde y códigos al azar.
Uso: python scripts/fixture-code128.py   (requiere: pip install reportlab)"""
import csv, json, random, string
from reportlab.graphics.barcode import code128

codigos = [r['codigo'] for r in csv.DictReader(open('data/catalogo.csv', encoding='utf-8'))]
borde = ['0', '1', '8', '12', '123', '1234', '12345', '123456', '1234567', '901A', 'A', 'AB', 'A1', '1A', 'A12',
         '12A', '1A2', 'A123', '123A', 'A1234', '1234A', '12A34', '00', '007', '0007', '6955501230098',
         '7501234567890', 'Zz9', '9zZ', 'abc123def', '1a2b3c']
rnd = random.Random(203)
azar = []
for _ in range(2000):
    n = rnd.randint(1, 14)
    pool = string.digits * 6 + string.ascii_letters if rnd.random() < 0.8 else string.digits
    azar.append(''.join(rnd.choice(pool) for _ in range(n)))
salida = {}
for c in dict.fromkeys(codigos + borde + azar):
    b = code128.Code128(c, quiet=False); b.validate(); salida[c] = b.encode()
json.dump(salida, open('tests/fixtures/code128_reportlab.json', 'w'), separators=(',', ':'))
print(len(salida), 'códigos')
