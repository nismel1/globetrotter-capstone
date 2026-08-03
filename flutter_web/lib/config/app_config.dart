/// Configuration de l'application Globetrotter Flutter Web.
class AppConfig {
  /// URL de base de l'API Flask.
  ///
  /// - En développement (`flutter run -d chrome`) l'API tourne sur :5000
  /// - En production (build servi par Flask) on utilise le même hôte (`/api`-less,
  ///   l'API est servie par le même serveur Flask).
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5000',
  );

  static const String appName = 'Globetrotter';
  static const String appSlogan = 'Découvrir le Gabon autrement';
}
