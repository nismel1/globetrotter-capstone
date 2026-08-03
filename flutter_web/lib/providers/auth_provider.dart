import 'package:flutter/foundation.dart';

import '../models/user.dart';
import '../services/api_service.dart';

/// État d'authentification global.
class AuthProvider extends ChangeNotifier {
  final ApiService _api;

  AuthProvider({ApiService? api}) : _api = api ?? ApiService.instance;

  UserProfile? _user;
  bool _loading = false;
  String? _error;

  UserProfile? get user => _user;
  bool get loading => _loading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;
  bool get isAdmin => _user?.isAdmin ?? false;
  String? get username => _user?.username;

  /// Recharge la session depuis SharedPreferences (au démarrage).
  Future<void> loadSession() async {
    await _api.loadSession();
    if (_api.isAuthenticated) {
      _user = UserProfile(
        username: _api.username ?? '',
        preferences: const [],
        isAdmin: _api.isAdmin,
      );
      notifyListeners();
    }
  }

  Future<bool> login(
    String identifier,
    String password, {
    bool admin = false,
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final profile = admin
          ? await _api.adminLogin(identifier, password)
          : await _api.login(identifier, password);
      _user = profile;
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> register(
    String username,
    String password, {
    List<String> preferences = const [],
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final profile = await _api.register(
        username,
        password,
        preferences: preferences,
      );
      _user = profile;
      return true;
    } on ApiException catch (e) {
      _error = e.message;
      return false;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _api.clearSession();
    _user = null;
    _error = null;
    notifyListeners();
  }

  Future<void> updatePreferences(List<String> preferences) async {
    try {
      final updated = await _api.updateProfile(preferences: preferences);
      _user = updated;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
  }
}
