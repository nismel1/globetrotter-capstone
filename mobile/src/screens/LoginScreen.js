import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { authAPI } from '../services/api';
import Button from '../components/Button';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

const LoginScreen = ({ navigation }) => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const prefs = preferences
          .split(',')
          .map(p => p.trim())
          .filter(Boolean);
        
        await authAPI.register(username.trim(), password, prefs);
        Alert.alert('Succès', 'Compte créé avec succès', [
          { text: 'OK', onPress: () => setMode('login') }
        ]);
      } else {
        const response = await authAPI.login(username.trim(), password);
        
        // Stocker le token et le username
        await AsyncStorage.setItem('token', response.token);
        await AsyncStorage.setItem('username', username.trim());
        
        // Naviguer vers l'application
        navigation.replace('Main');
      }
    } catch (error) {
      Alert.alert(
        'Erreur', 
        error.response?.data?.error || 'Une erreur est survenue'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.blancCasse, COLORS.bleuClair]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={require('../assets/login-hero.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Logo */}
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Eyebrow */}
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>COMPTE VOYAGEUR</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {mode === 'login' ? 'Retrouver mon carnet' : 'Créer mon espace'}
          </Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            <Button
              title="Connexion"
              variant={mode === 'login' ? 'primary' : 'ghost'}
              onPress={() => setMode('login')}
              style={styles.tab}
            />
            <Button
              title="Inscription"
              variant={mode === 'register' ? 'primary' : 'ghost'}
              onPress={() => setMode('register')}
              style={styles.tab}
            />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom d'utilisateur</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Entrez votre nom"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
              />
            </View>

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Préférences</Text>
                <TextInput
                  style={styles.input}
                  value={preferences}
                  onChangeText={setPreferences}
                  placeholder="nature, food, culture"
                />
              </View>
            )}

            <Button
              title="Continuer"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </View>

          {/* Notice */}
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Connectez-vous pour accéder à vos favoris et recommandations
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xxxl,
  },
  heroContainer: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(93, 107, 107, 0.3)',
  },
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: -50,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  },
  logo: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    marginBottom: SPACING.md,
    borderRadius: 36,
  },
  eyebrow: {
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.rosePoudre,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
  },
  eyebrowText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.surface,
  },
  title: {
    ...TYPOGRAPHY.displaySmall,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  tabs: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
  },
  form: {
    gap: SPACING.lg,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
  },
  input: {
    height: 48,
    borderWidth: 2,
    borderColor: COLORS.bleuGlacier,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
  notice: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.bleuClair,
    borderRadius: RADIUS.md,
  },
  noticeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default LoginScreen;
