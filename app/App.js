import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ConnectivityProvider } from './src/contexts/ConnectivityContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <ConnectivityProvider>
                    <StatusBar style="light" backgroundColor="#0B3B60" />
                    <AppNavigator />
                </ConnectivityProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
