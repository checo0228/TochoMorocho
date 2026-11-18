"""Generador de referencia (Python/reportlab) — es el que se usó para imprimir y está PROBADO en la Zebra ZD220d.
La app debe producir PDFs equivalentes (mismas medidas). Uso: python etiquetas_ref.py  -> genera muestras_grande.pdf y muestras_chica.pdf
Requiere: pip install reportlab"""
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.graphics.barcode import code128
from reportlab.pdfbase.pdfmetrics import stringWidth

def fit_size(t, font, mx, mn, w):
    s = mx
    while s > mn and stringWidth(t, font, s) > w: s -= 0.25
    return s

def fit_cut(t, font, mx, mn, w):
    s = fit_size(t, font, mx, mn, w)
    if stringWidth(t, font, s) > w:
        while t and stringWidth(t + '…', font, s) > w: t = t[:-1]
        t = t.rstrip() + '…'
    return t, s

def barcode(c, code, W, y, h, maxw):
    for bw in (0.375 * mm, 0.25 * mm):          # módulo múltiplo de 0.125 mm (203 dpi)
        b = code128.Code128(code, barHeight=h, barWidth=bw, quiet=False)
        if b.width <= maxw:
            b.drawOn(c, (W - b.width) / 2, y); return
    raise ValueError('Código demasiado largo: ' + code)

def precio_fmt(p): return f"$ {p:,.2f}"

def grande(c, nombre, precio, code):            # página 38x25 mm, 1 por página
    W, H = 38 * mm, 25 * mm
    if nombre and nombre != '.':
        s = fit_size(nombre, 'Helvetica-Bold', 7, 4.5, 35.5 * mm)
        c.setFont('Helvetica-Bold', s); c.drawCentredString(W / 2, H - 2.7 * mm, nombre)
    c.setFont('Helvetica-Bold', 10.5); c.drawCentredString(W / 2, H - 6.6 * mm, precio_fmt(precio))
    barcode(c, code, W, 3.0 * mm, 12.5 * mm, 33 * mm)
    c.setFont('Helvetica', 6); c.drawCentredString(W / 2, 0.8 * mm, code)

def chica(c, nombre, precio, code):             # etiqueta 27x13 mm (se coloca 3 por hilera)
    W = 27 * mm; ps = precio_fmt(precio)
    c.setFont('Helvetica-Bold', 7); pw = stringWidth(ps, 'Helvetica-Bold', 7)
    c.drawRightString(W - 0.8 * mm, 9.2 * mm, ps)
    if nombre and nombre != '.':
        t, s = fit_cut(nombre, 'Helvetica', 5.5, 4, W - 1.6 * mm - pw - 1 * mm)
        c.setFont('Helvetica', s); c.drawString(0.8 * mm, 9.2 * mm, t)
    barcode(c, code, W, 3.0 * mm, 5.4 * mm, 25.4 * mm)
    c.setFont('Helvetica', 5); c.drawCentredString(W / 2, 1.1 * mm, code)

X_CHICA = [1.5 * mm, 31.5 * mm, 61.5 * mm]      # página 90x13 mm

def pdf_grandes(fn, items):                     # items: [(nombre, precio, codigo, cantidad)]
    c = canvas.Canvas(fn, pagesize=(38 * mm, 25 * mm))
    for n, p, k, q in items:
        for _ in range(q): grande(c, n, p, k); c.showPage()
    c.save()

def pdf_chicas(fn, items):                      # se llenan de izq. a der.; la última hilera puede quedar incompleta
    flat = [(n, p, k) for n, p, k, q in items for _ in range(q)]
    c = canvas.Canvas(fn, pagesize=(90 * mm, 13 * mm))
    for i in range(0, len(flat), 3):
        for j, (n, p, k) in enumerate(flat[i:i + 3]):
            c.saveState(); c.translate(X_CHICA[j], 0); chica(c, n, p, k); c.restoreState()
        c.showPage()
    c.save()

if __name__ == '__main__':
    casos = [('gorro navidad', 15, '869', 1), ('', 19, '8', 1), ('termo digital sencillo con luz led extra', 90, '90051', 1),
             ('inflable', 1300, '802', 1), ('pieza sin nombre', 62.9999, '901A', 1), ('cepillo uñas', 10, '84', 2)]
    pdf_grandes('muestras_grande.pdf', casos)
    pdf_chicas('muestras_chica.pdf', casos)
