import 'package:flutter/material.dart';

/// Design system Globetrotter — palette inspirée du Gabon.
class AppColors {
  static const Color vertGabon = Color(0xFF009639);
  static const Color jauneGabon = Color(0xFFFCD116);
  static const Color bleuGabon = Color(0xFF3A75C4);
  static const Color ivoire = Color(0xFFFFF8E7);
  static const Color noirProfond = Color(0xFF111111);
  static const Color terreCuite = Color(0xFFB65A2A);
  static const Color vertForet = Color(0xFF064D2C);
  static const Color oceanBrume = Color(0xFFDCECF7);
  static const Color sableChaud = Color(0xFFF4E6C1);
  static const Color brumeVerte = Color(0xFFD9F0E1);
  static const Color nuitProfonde = Color(0xFF071A14);
  static const Color carteClaire = Color(0xFFFFFDF8);
  static const Color ligneDouce = Color(0xFFE8E2D4);
  static const Color texteSecondaire = Color(0xFF5C5C5C);
  static const Color texteMuted = Color(0xFF8A8A8A);

  static const Color primary = vertGabon;
  static const Color accent = jauneGabon;
  static const Color accentSecondary = bleuGabon;
  static const Color surface = Color(0xFFFFFFFF);
  static const Color background = ivoire;
  static const Color textPrimary = noirProfond;
  static const Color textSecondary = texteSecondaire;
  static const Color textMuted = texteMuted;
  static const Color success = vertGabon;
  static const Color error = terreCuite;
  static const Color warning = jauneGabon;
}

class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;
}

class AppRadius {
  static const double sm = 12;
  static const double md = 18;
  static const double lg = 24;
  static const double xl = 32;
  static const double full = 999;
}

class AppTextStyles {
  static const String displayFont = 'Poppins';
  static const String bodyFont = 'Inter';

  static TextStyle displayLarge({Color color = AppColors.textPrimary}) =>
      TextStyle(
        fontFamily: displayFont,
        fontSize: 34,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.8,
        color: color,
        height: 1.1,
      );

  static TextStyle displayMedium({Color color = AppColors.textPrimary}) =>
      TextStyle(
        fontFamily: displayFont,
        fontSize: 28,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.4,
        color: color,
        height: 1.15,
      );

  static TextStyle displaySmall({Color color = AppColors.textPrimary}) =>
      TextStyle(
        fontFamily: displayFont,
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: color,
        height: 1.2,
      );

  static TextStyle bodyLarge({Color color = AppColors.textPrimary}) =>
      TextStyle(
        fontFamily: bodyFont,
        fontSize: 17,
        fontWeight: FontWeight.w400,
        color: color,
        height: 1.5,
      );

  static TextStyle bodyMedium({Color color = AppColors.textPrimary}) =>
      TextStyle(
        fontFamily: bodyFont,
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: color,
        height: 1.45,
      );

  static TextStyle bodySmall({Color color = AppColors.textPrimary}) =>
      TextStyle(
        fontFamily: bodyFont,
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: color,
        height: 1.4,
      );

  static TextStyle labelLarge({Color color = AppColors.textPrimary}) =>
      TextStyle(
        fontFamily: displayFont,
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: color,
      );

  static TextStyle labelMedium({Color color = AppColors.textPrimary}) =>
      TextStyle(
        fontFamily: displayFont,
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: color,
      );

  static TextStyle labelSmall({Color color = AppColors.textPrimary}) =>
      TextStyle(
        fontFamily: displayFont,
        fontSize: 11,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.8,
        color: color,
      );
}

class AppTheme {
  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      fontFamily: AppTextStyles.bodyFont,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surface,
        error: AppColors.error,
      ),
    );

    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.vertForet,
        foregroundColor: AppColors.ivoire,
        elevation: 0,
        centerTitle: false,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.ivoire,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.lg,
          ),
          textStyle: AppTextStyles.labelLarge(color: AppColors.ivoire),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.vertForet,
          side: const BorderSide(color: AppColors.ligneDouce),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.lg,
          ),
          textStyle: AppTextStyles.labelLarge(color: AppColors.vertForet),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppColors.primary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.lg,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.ligneDouce),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.ligneDouce),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        labelStyle: AppTextStyles.bodyMedium(color: AppColors.textSecondary),
        hintStyle: AppTextStyles.bodyMedium(color: AppColors.textMuted),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.ligneDouce,
        thickness: 1,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primary,
        labelTextStyle: WidgetStatePropertyAll(
          AppTextStyles.labelSmall(color: AppColors.textPrimary),
        ),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? AppColors.ivoire : AppColors.textMuted,
          );
        }),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.brumeVerte,
        selectedColor: AppColors.primary,
        labelStyle: AppTextStyles.labelMedium(color: AppColors.vertForet),
        secondaryLabelStyle: AppTextStyles.labelMedium(color: AppColors.ivoire),
        side: BorderSide.none,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
      ),
    );
  }
}

List<BoxShadow> appShadow({
  Color color = AppColors.vertForet,
  double opacity = 0.12,
  double blur = 20,
  double y = 10,
}) {
  return [
    BoxShadow(
      color: color.withValues(alpha: opacity),
      offset: Offset(0, y),
      blurRadius: blur,
    ),
  ];
}
