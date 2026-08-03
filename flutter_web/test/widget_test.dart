import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:globetrotter/main.dart';

void main() {
  testWidgets('App launches successfully', (WidgetTester tester) async {
    await tester.pumpWidget(const GlobetrotterApp());
    // Verify the app renders without errors
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
