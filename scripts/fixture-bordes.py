"""Genera PDFs de casos borde con el generador PROBADO (docs/referencia/etiquetas_ref.py),
para comparar píxel por píxel contra los de la app. Uso: python scripts/fixture-bordes.py"""
import sys, json
sys.path.insert(0, 'docs/referencia')
import etiquetas_ref as ref

casos = [
    ('a', 1, '1', 1), ('ab', 22, '12', 1), ('abc', 333, '123', 1), ('abcd', 4444, '1234', 1),
    ('cinco digitos', 55555.5, '12345', 1), ('alfanumerico', 62.9999, '901A', 1),
    ('nombre de veintinueve letras', 29, '8994', 1), ('nombre larguisimo que no cabe ni a cuatro y medio puntos', 1000, '1160', 1),
    ('', 999.99, '7', 1), ('.', 1234567.89, '90034', 1),
    ('muñeco navideño cañón', 149.5, '604', 1), ('ÁÉÍÓÚ áéíóú ü Ñ', 10, '1168', 1),
]
ref.pdf_grandes('tests/fixtures/bordes_grande.pdf', casos)
ref.pdf_chicas('tests/fixtures/bordes_chica.pdf', casos)
json.dump([{'nombre': n, 'precio': p, 'codigo': c, 'cantidad': q} for n, p, c, q in casos],
          open('tests/fixtures/bordes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(casos), 'casos')
