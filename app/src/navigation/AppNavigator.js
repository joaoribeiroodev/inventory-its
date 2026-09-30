import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ItemDetalheScreen from '../screens/ItemDetalheScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import ItensListaScreen from '../screens/ItensListaScreen';
import ItemFormScreen from '../screens/ItemFormScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICONES_ABAS = {
    Bipar: 'qr-code',
    Itens: 'cube',
    Configurações: 'settings-sharp',
};

const headerScreenOptions = {
    headerStyle: { backgroundColor: colors.primary },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700' },
};

const navigationTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.surface,
        border: colors.border,
    },
};

function AbasPrincipais() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                ...headerScreenOptions,
                tabBarActiveTintColor: colors.accentDark,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
                tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                        name={focused ? ICONES_ABAS[route.name] : `${ICONES_ABAS[route.name]}-outline`}
                        size={size}
                        color={color}
                    />
                ),
            })}
        >
            <Tab.Screen name="Bipar" component={ScannerScreen} options={{ headerShown: false }} />
            <Tab.Screen name="Itens" component={ItensListaScreen} />
            <Tab.Screen name="Configurações" component={ConfiguracoesScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { usuario, carregando } = useAuth();

    if (carregando) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer theme={navigationTheme}>
            <Stack.Navigator screenOptions={headerScreenOptions}>
                {!usuario ? (
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                ) : (
                    <>
                        <Stack.Screen name="Principal" component={AbasPrincipais} options={{ headerShown: false }} />
                        <Stack.Screen name="ItemDetalhe" component={ItemDetalheScreen} options={{ title: 'Item' }} />
                        <Stack.Screen name="Historico" component={HistoricoScreen} options={{ title: 'Histórico' }} />
                        <Stack.Screen name="ItemForm" component={ItemFormScreen} options={{ title: 'Novo item' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
