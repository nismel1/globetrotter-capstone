import 'package:flutter/material.dart';

import '../config/theme.dart';

/// Motif décoratif gabonais — bandeau géométrique inspiré des tissus
/// traditionnels (tribal). Utilisé en header des écrans.
class GabonesePattern extends StatelessWidget {
  final double height;
  final double opacity;
  final Color? color;

  const GabonesePattern({
    super.key,
    this.height = 72,
    this.opacity = 0.18,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final baseColor = color ?? AppColors.jauneGabon;
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: _GabonesePatternPainter(color: baseColor, opacity: opacity),
      ),
    );
  }
}

class _GabonesePatternPainter extends CustomPainter {
  final Color color;
  final double opacity;

  _GabonesePatternPainter({required this.color, required this.opacity});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withValues(alpha: opacity)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2;
    final fill = Paint()
      ..color = color.withValues(alpha: opacity * 0.55)
      ..style = PaintingStyle.fill;

    final w = size.width;
    final h = size.height;
    const step = 28.0;

    // Lignes de base
    canvas.drawLine(Offset(0, 6), Offset(w, 6), paint);
    canvas.drawLine(Offset(0, h - 6), Offset(w, h - 6), paint);

    // Zigzag central
    final path = Path();
    double x = 0;
    var up = true;
    while (x < w) {
      if (up) {
        path.lineTo(x + step / 2, h * 0.38);
        path.lineTo(x + step, h * 0.18);
      } else {
        path.lineTo(x + step / 2, h * 0.18);
        path.lineTo(x + step, h * 0.38);
      }
      up = !up;
      x += step;
    }
    canvas.drawPath(path, paint);

    // Losanges / triangles
    for (var i = 0; i * step * 2 < w; i++) {
      final cx = i * step * 2 + step;
      final tri = Path()
        ..moveTo(cx, h * 0.55)
        ..lineTo(cx + 9, h * 0.78)
        ..lineTo(cx - 9, h * 0.78)
        ..close();
      canvas.drawPath(tri, fill);
    }

    // Petits points décoratifs
    final dotPaint = Paint()..color = color.withValues(alpha: opacity);
    for (var i = 0; i * step * 2 < w; i++) {
      final cx = i * step * 2 + step;
      canvas.drawCircle(Offset(cx, h * 0.5), 2.4, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _GabonesePatternPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.opacity != opacity;
}
