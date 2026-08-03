import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'config/app_config.dart';
import 'config/theme.dart';
import 'navigation/app_navigator.dart';
import 'providers/app_provider.dart';
import 'providers/auth_provider.dart';
import 'screens/admin_screen.dart';
import 'screens/events_screen.dart';
import 'screens/explorer_screen.dart';
import 'screens/favorites_screen.dart';
import 'screens/home_screen.dart';
import 'screens/itineraries_screen.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/proposals_screen.dart';
import 'screens/recommendations_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const GlobetrotterApp());
}

/// Racine de l'application.
class GlobetrotterApp extends StatelessWidget {
  const GlobetrotterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AppProvider()),
      ],
      child: MaterialApp(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        home: const _AuthGate(),
      ),
    );
  }
}

/// Affiche soit l'écran de connexion, soit le shell principal.
class _AuthGate extends StatefulWidget {
  const _AuthGate();

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final auth = context.read<AuthProvider>();
    final app = context.read<AppProvider>();
    await auth.loadSession();
    if (auth.isAuthenticated) {
      await app.loadDestinations();
    }
    if (mounted) setState(() => _initialized = true);
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }
    return const _AppShell();
  }
}

/// Cœur de l'application : navigation responsive (sidebar desktop /
/// bottom nav mobile) + écrans par onglet.
class _AppShell extends StatefulWidget {
  const _AppShell();

  @override
  State<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<_AppShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    AppNavigator.registerTabSwitcher((index) {
      if (mounted) setState(() => _index = index);
    });
  }

  @override
  void dispose() {
    AppNavigator.registerTabSwitcher((_) {});
    super.dispose();
  }

  List<_TabItem> _buildTabs(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final tabs = <_TabItem>[
      _TabItem(
        label: 'Accueil',
        icon: Icons.home_outlined,
        selectedIcon: Icons.home,
      ),
      _TabItem(
        label: 'Explorer',
        icon: Icons.explore_outlined,
        selectedIcon: Icons.explore,
      ),
      _TabItem(
        label: 'Favoris',
        icon: Icons.favorite_border,
        selectedIcon: Icons.favorite,
      ),
      _TabItem(
        label: 'Roadmap',
        icon: Icons.map_outlined,
        selectedIcon: Icons.map,
      ),
      _TabItem(
        label: 'Événements',
        icon: Icons.event_outlined,
        selectedIcon: Icons.event,
      ),
      _TabItem(
        label: 'Suggestions',
        icon: Icons.tips_and_updates_outlined,
        selectedIcon: Icons.tips_and_updates,
      ),
      _TabItem(
        label: 'Propositions',
        icon: Icons.add_location_alt_outlined,
        selectedIcon: Icons.add_location_alt,
      ),
      if (auth.isAdmin)
        _TabItem(
          label: 'Admin',
          icon: Icons.admin_panel_settings_outlined,
          selectedIcon: Icons.admin_panel_settings,
        ),
      _TabItem(
        label: 'Profil',
        icon: Icons.person_outline,
        selectedIcon: Icons.person,
      ),
    ];
    return tabs;
  }

  @override
  Widget build(BuildContext context) {
    final tabs = _buildTabs(context);
    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 900;

    final mobileIndex = _index;
    final safeIndex = mobileIndex.clamp(0, tabs.length - 1);

    if (isDesktop) {
      return Scaffold(
        body: Row(
          children: [
            _Sidebar(
              tabs: tabs,
              currentIndex: safeIndex,
              onSelected: (i) => setState(() => _index = i),
            ),
            const VerticalDivider(width: 1, thickness: 1),
            Expanded(
              child: IndexedStack(
                index: safeIndex,
                children: [
                  const HomeScreen(),
                  const ExplorerScreen(),
                  const FavoritesScreen(),
                  const ItinerariesScreen(),
                  const EventsScreen(),
                  const RecommendationsScreen(),
                  const ProposalsScreen(),
                  if (tabs.length > 7) const AdminScreen(),
                  const ProfileScreen(),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.explore, color: AppColors.jauneGabon),
            const SizedBox(width: AppSpacing.sm),
            Text(tabs[safeIndex].label),
          ],
        ),
      ),
      body: IndexedStack(
        index: safeIndex,
        children: [
          const HomeScreen(),
          const ExplorerScreen(),
          const FavoritesScreen(),
          const ItinerariesScreen(),
          const EventsScreen(),
          const RecommendationsScreen(),
          const ProposalsScreen(),
          if (tabs.length > 7) const AdminScreen(),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeIndex,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: tabs
            .map(
              (t) => NavigationDestination(
                icon: Icon(t.icon),
                selectedIcon: Icon(t.selectedIcon),
                label: t.label,
              ),
            )
            .toList(),
      ),
    );
  }
}

class _TabItem {
  final String label;
  final IconData icon;
  final IconData selectedIcon;

  _TabItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });
}

/// Sidebar pour les écrans larges (desktop).
class _Sidebar extends StatelessWidget {
  final List<_TabItem> tabs;
  final int currentIndex;
  final ValueChanged<int> onSelected;

  const _Sidebar({
    required this.tabs,
    required this.currentIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      color: AppColors.vertForet,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.ivoire,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: const Icon(Icons.explore, color: AppColors.vertGabon),
                ),
                const SizedBox(width: AppSpacing.md),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Globetrotter',
                      style: AppTextStyles.labelLarge(color: AppColors.ivoire),
                    ),
                    Text(
                      'Libreville',
                      style: AppTextStyles.bodySmall(
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(color: Colors.white12),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              itemCount: tabs.length,
              itemBuilder: (context, index) {
                final tab = tabs[index];
                final selected = index == currentIndex;
                return Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: 2,
                  ),
                  child: Material(
                    color: selected ? AppColors.vertGabon : Colors.transparent,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    child: ListTile(
                      dense: true,
                      leading: Icon(
                        selected ? tab.selectedIcon : tab.icon,
                        color: selected ? AppColors.ivoire : Colors.white70,
                      ),
                      title: Text(
                        tab.label,
                        style: AppTextStyles.labelMedium(
                          color: selected ? AppColors.ivoire : Colors.white70,
                        ),
                      ),
                      onTap: () => onSelected(index),
                    ),
                  ),
                );
              },
            ),
          ),
          const Divider(color: Colors.white12),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'v1.0 • Gabon',
                    style: AppTextStyles.bodySmall(color: Colors.white38),
                  ),
                ),
                const Icon(
                  Icons.favorite,
                  color: AppColors.jauneGabon,
                  size: 16,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
