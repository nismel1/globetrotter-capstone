/// Navigation helper
///
/// Le shell (main.dart) enregistre un callback [switchTab] qui permet de
/// naviguer entre les onglets (Accueil, Explorer, Favoris, Roadmap, Profil).
class AppNavigator {
  AppNavigator._();

  static void Function(int index)? _switchTab;
  static int _currentIndex = 0;

  /// Index de l'onglet Profil selon que l'utilisateur est admin ou non.
  static int get profileTabIndex => 8;

  static void registerTabSwitcher(void Function(int index) fn) {
    _switchTab = fn;
  }

  static void switchTab(int index) {
    _switchTab?.call(index);
  }

  static int get currentIndex => _currentIndex;

  static void setCurrentIndex(int index) {
    _currentIndex = index;
  }
}
