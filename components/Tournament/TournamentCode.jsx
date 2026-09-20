import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { loginWithTournamentCode } from '../../helpers/authApi'
import { parseTabletLoginCode } from '../../helpers/parseTabletLoginCode'
import { userFacingErrorMessage } from '../../helpers/userFacingError'
import useAuth from '../../hooks/useAuth'
import { colors } from '../../theme/colors'

/**
 * Ekran uwierzytelnienia kodem / QR tabletu sędziowskiego.
 * route.params.code — opcjonalny kod ze skanu lub deep linku.
 */
const TournamentCode = ({ route, navigation }) => {
  const { setAuth } = useAuth()
  const initialCode = String(route?.params?.code ?? '').toUpperCase()

  const [code, setCode] = useState(initialCode)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  const scanLockRef = useRef(false)
  const submittingRef = useRef(false)
  const autoLoginDoneRef = useRef(false)

  const submitCode = useCallback(
    async (rawCode) => {
      const normalized = String(rawCode ?? '').trim().toUpperCase()
      if (!normalized || submittingRef.current) return

      submittingRef.current = true
      setSubmitting(true)
      setErrorMsg('')

      try {
        const { ok, data, status, error } = await loginWithTournamentCode(normalized)

        if (!ok) {
          setErrorMsg(userFacingErrorMessage({
            error,
            status,
            data,
            fallback: 'Nieprawidłowy kod turnieju',
          }))
          return
        }

        setAuth({
          accessToken: data?.token,
          tournamentId: data?.tournamentId,
        })
      } catch (error) {
        setErrorMsg(userFacingErrorMessage({
          error,
          fallback: 'Nie udało się zalogować do sędziowania',
        }))
      } finally {
        submittingRef.current = false
        setSubmitting(false)
      }
    },
    [setAuth],
  )

  useEffect(() => {
    if (!initialCode || autoLoginDoneRef.current) return
    autoLoginDoneRef.current = true
    void submitCode(initialCode)
  }, [initialCode, submitCode])

  const applyScannedCode = useCallback(
    (raw) => {
      const parsed = parseTabletLoginCode(raw)
      if (!parsed) {
        Alert.alert(
          'Nieznany QR',
          'To nie wygląda na kod logowania tabletu twentySix. Spróbuj ponownie albo wpisz kod ręcznie.',
        )
        scanLockRef.current = false
        return
      }
      setCode(parsed)
      setScanning(false)
      scanLockRef.current = false
      void submitCode(parsed)
    },
    [submitCode],
  )

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result?.granted) {
        Alert.alert(
          'Brak dostępu do kamery',
          'Włącz uprawnienie kamery w ustawieniach tabletu, żeby skanować QR.',
        )
        return
      }
    }
    scanLockRef.current = false
    setScanning(true)
  }

  const handleBarcodeScanned = ({ data }) => {
    if (scanLockRef.current) return
    scanLockRef.current = true
    applyScannedCode(data)
  }

  if (scanning) {
    return (
      <View style={styles.scannerRoot}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.scannerOverlay} pointerEvents="box-none">
          <Text style={styles.scannerTitle}>Zeskanuj QR tabletu</Text>
          <View style={styles.scanFrame} />
          <Text style={styles.scannerHint}>
            Skieruj aparat na kod QR ze strony turnieju (panel organizatora)
          </Text>
          <Pressable
            style={[styles.button, styles.scannerCancel]}
            onPress={() => {
              scanLockRef.current = false
              setScanning(false)
            }}
          >
            <Text style={styles.buttonText}>Anuluj</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Sędziowanie turnieju</Text>
      <Text style={styles.title}>Kod turnieju</Text>
      <Text style={styles.hint}>
        Zeskanuj QR organizatora albo wpisz kod — wszystkie tablety używają tego samego kodu
      </Text>

      <Pressable style={styles.button} onPress={openScanner} disabled={submitting}>
        <Text style={styles.buttonText}>Skanuj QR</Text>
      </Pressable>

      <Text style={styles.orLabel}>albo wpisz kod</Text>

      <View style={styles.form}>
        <Text style={styles.errorMessage}>{errorMsg}</Text>
        <TextInput
          style={styles.input}
          placeholder="Kod turnieju"
          placeholderTextColor={colors.placeholder}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          autoCorrect={false}
          autoCapitalize="characters"
          maxLength={16}
          editable={!submitting}
        />
        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={() => submitCode(code)}
          disabled={submitting || !code.trim()}
        >
          {submitting ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Wejdź do turnieju</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack()
          }}
        >
          <Text style={styles.backBtnText}>Wróć</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
    textAlign: 'center',
  },
  orLabel: {
    color: colors.textMuted,
    marginVertical: 16,
    fontSize: 13,
  },
  form: {
    alignItems: 'center',
    width: '100%',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.dangerText,
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    marginBottom: 20,
    color: colors.text,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    width: 260,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.accent,
    borderRadius: 5,
    minWidth: 180,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.onAccent,
    fontWeight: 'bold',
  },
  backBtn: {
    marginTop: 20,
    paddingVertical: 10,
  },
  backBtnText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  scannerRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 12,
  },
  scannerHint: {
    color: '#fff',
    textAlign: 'center',
    opacity: 0.85,
    marginBottom: 8,
  },
  scannerCancel: {
    marginBottom: 24,
  },
})

export default TournamentCode
