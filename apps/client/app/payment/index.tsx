import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import {
  createPayment, getPaymentStatus, getSavedCards, deleteSavedCard,
  SavedCard,
} from '@ayla/shared';

const PLATFORM_FEE_PCT = 0.05; // 5% platform commission

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return `${days[date.getDay()]}, ${d} ${MONTHS_RU[m - 1]}`;
}

function cardIcon(type: SavedCard['card_type']): string {
  switch (type) {
    case 'Visa':       return '💳';
    case 'MasterCard': return '💳';
    case 'Mir':        return '💳';
    default:           return '💳';
  }
}

function cardLabel(card: SavedCard): string {
  return `${card.card_type} •••• ${card.last4}`;
}

function cardExpiry(card: SavedCard): string {
  return `${String(card.expiry_month).padStart(2, '0')}/${String(card.expiry_year).slice(-2)}`;
}

// ─── Card row ─────────────────────────────────────────────────────────────────

function CardRow({ card, selected, onSelect, onDelete }: {
  card: SavedCard;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable style={[S.cardRow, selected && S.cardRowSelected]} onPress={onSelect}>
      <View style={[S.radio, selected && S.radioSelected]}>
        {selected && <View style={S.radioDot} />}
      </View>
      <View style={S.cardIcon}>
        <Text style={{ fontSize: 18 }}>{cardIcon(card.card_type)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.cardLabel}>{cardLabel(card)}</Text>
        <Text style={S.cardExpiry}>{cardExpiry(card)}</Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={S.deleteBtn}>
        <Ionicons name="trash-outline" size={16} color="#D1D5DB" />
      </Pressable>
    </Pressable>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    booking_id: string;
    specialist_name: string;
    service_name: string;
    date: string;
    time: string;
    price: string;
  }>();

  const price = Number(params.price);
  const fee = Math.round(price * PLATFORM_FEE_PCT);
  const total = price + fee;

  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | 'new'>('new');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    getSavedCards()
      .then(data => {
        setCards(data);
        if (data.length > 0) setSelectedCardId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, []);

  const handleDeleteCard = useCallback((card: SavedCard) => {
    Alert.alert(
      'Удалить карту?',
      `${cardLabel(card)} будет удалена из сохранённых.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSavedCard(card.id);
              setCards(prev => {
                const next = prev.filter(c => c.id !== card.id);
                if (selectedCardId === card.id) {
                  setSelectedCardId(next.length > 0 ? next[0].id : 'new');
                }
                return next;
              });
            } catch {
              Alert.alert('Ошибка', 'Не удалось удалить карту');
            }
          },
        },
      ],
    );
  }, [selectedCardId]);

  const pollUntilDone = useCallback(async (paymentId: string): Promise<'succeeded' | 'canceled'> => {
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 2500));
      try {
        const result = await getPaymentStatus(paymentId);
        if (result.status === 'succeeded') return 'succeeded';
        if (result.status === 'canceled') return 'canceled';
      } catch {
        // continue polling
      }
    }
    return 'canceled';
  }, []);

  const handlePay = useCallback(async () => {
    setPaying(true);
    try {
      const isNewCard = selectedCardId === 'new';
      const paymentOpts = isNewCard
        ? { save_card: true }
        : { payment_method_id: selectedCardId };

      const payment = await createPayment(params.booking_id, paymentOpts);

      if (payment.status === 'succeeded') {
        // Saved card — instant success
        navigateToConfirmation();
        return;
      }

      if (!payment.confirmation_url) {
        Alert.alert('Ошибка оплаты', 'Не удалось получить ссылку для оплаты. Попробуйте снова.');
        return;
      }

      // Open YooKassa in system browser
      const returnUrl = 'ayla-client://payment/return';
      const result = await WebBrowser.openAuthSessionAsync(
        payment.confirmation_url,
        returnUrl,
      );

      if (result.type === 'cancel') {
        // User closed browser without completing
        Alert.alert('Оплата отменена', 'Вы закрыли страницу оплаты. Хотите попробовать снова?', [
          { text: 'Позже', style: 'cancel' },
          { text: 'Повторить', onPress: handlePay },
        ]);
        return;
      }

      // Poll for final status
      const status = await pollUntilDone(payment.payment_id);

      if (status === 'succeeded') {
        navigateToConfirmation();
      } else {
        Alert.alert(
          'Оплата не прошла',
          'Платёж был отклонён. Проверьте данные карты или попробуйте другой способ.',
          [
            { text: 'Закрыть', style: 'cancel' },
            { text: 'Повторить', onPress: handlePay },
          ],
        );
      }
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === 'INSUFFICIENT_FUNDS') {
        Alert.alert('Недостаточно средств', 'На карте недостаточно средств для оплаты.');
      } else if (code === 'CARD_EXPIRED') {
        Alert.alert('Карта просрочена', 'Срок действия карты истёк. Используйте другую карту.');
      } else {
        Alert.alert('Ошибка оплаты', 'Произошла ошибка при обработке платежа. Попробуйте снова.', [
          { text: 'Закрыть', style: 'cancel' },
          { text: 'Повторить', onPress: handlePay },
        ]);
      }
    } finally {
      setPaying(false);
    }
  }, [selectedCardId, params.booking_id, pollUntilDone]);

  function navigateToConfirmation() {
    router.replace({
      pathname: '/booking/confirmation',
      params: {
        booking_id: params.booking_id,
        specialist_name: params.specialist_name,
        service_name: params.service_name,
        date: params.date,
        time: params.time,
        price: params.price,
      },
    } as any);
  }

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1628" />
        </Pressable>
        <Text style={S.headerTitle}>Оплата</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Booking summary */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Детали записи</Text>
          <View style={S.summaryCard}>
            <SummaryRow icon="person-outline" label="Мастер" value={params.specialist_name} />
            <View style={S.divider} />
            <SummaryRow icon="cut-outline" label="Услуга" value={params.service_name} />
            <View style={S.divider} />
            <SummaryRow
              icon="calendar-outline"
              label="Дата и время"
              value={`${formatDate(params.date)}, ${params.time}`}
            />
          </View>
        </View>

        {/* Price breakdown */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Итого</Text>
          <View style={S.priceCard}>
            <View style={S.priceRow}>
              <Text style={S.priceRowLabel}>Услуга</Text>
              <Text style={S.priceRowValue}>{price.toLocaleString('ru-RU')} ₽</Text>
            </View>
            <View style={S.priceRow}>
              <Text style={S.priceRowLabel}>Комиссия платформы (5%)</Text>
              <Text style={S.priceRowValue}>{fee.toLocaleString('ru-RU')} ₽</Text>
            </View>
            <View style={S.priceDivider} />
            <View style={S.priceRow}>
              <Text style={S.priceTotalLabel}>К оплате</Text>
              <Text style={S.priceTotalValue}>{total.toLocaleString('ru-RU')} ₽</Text>
            </View>
          </View>
        </View>

        {/* Payment method */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Способ оплаты</Text>

          {loadingCards ? (
            <ActivityIndicator color="#7B61FF" style={{ marginVertical: 20 }} />
          ) : (
            <View style={S.cardsContainer}>
              {cards.map(card => (
                <CardRow
                  key={card.id}
                  card={card}
                  selected={selectedCardId === card.id}
                  onSelect={() => setSelectedCardId(card.id)}
                  onDelete={() => handleDeleteCard(card)}
                />
              ))}

              {/* New card option */}
              <Pressable
                style={[S.cardRow, selectedCardId === 'new' && S.cardRowSelected]}
                onPress={() => setSelectedCardId('new')}
              >
                <View style={[S.radio, selectedCardId === 'new' && S.radioSelected]}>
                  {selectedCardId === 'new' && <View style={S.radioDot} />}
                </View>
                <View style={S.cardIcon}>
                  <Ionicons name="add-circle-outline" size={22} color="#7B61FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.cardLabel}>Новая карта</Text>
                  <Text style={S.cardExpiry}>Visa, MasterCard, Мир</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={S.secureNote}>
          <Ionicons name="lock-closed-outline" size={12} color="#9CA3AF" />
          {'  '}Оплата защищена по стандарту PCI DSS. Данные карты обрабатываются YooKassa.
        </Text>
      </ScrollView>

      {/* Bottom pay button */}
      <View style={S.bottomBar}>
        <Pressable
          testID="pay-btn"
          style={[S.payBtn, paying && S.payBtnLoading]}
          onPress={handlePay}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={S.payBtnText}>
              Оплатить · {total.toLocaleString('ru-RU')} ₽
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function SummaryRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={S.summaryRow}>
      <View style={S.summaryIcon}>
        <Ionicons name={icon} size={16} color="#7B61FF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.summaryLabel}>{label}</Text>
        <Text style={S.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EDF8',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0EDF8', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1628' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 0 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#7A7286', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Booking summary card
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  summaryIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },
  summaryLabel: { fontSize: 12, color: '#7A7286', marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1A1628' },
  divider: { height: 1, backgroundColor: '#F0EDF8', marginHorizontal: 14 },

  // Price card
  priceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceRowLabel: { fontSize: 14, color: '#7A7286' },
  priceRowValue: { fontSize: 14, color: '#1A1628', fontWeight: '500' },
  priceDivider: { height: 1, backgroundColor: '#F0EDF8' },
  priceTotalLabel: { fontSize: 16, fontWeight: '700', color: '#1A1628' },
  priceTotalValue: { fontSize: 20, fontWeight: '800', color: '#7B61FF' },

  // Cards
  cardsContainer: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0EDF8',
  },
  cardRowSelected: { backgroundColor: '#F8F7FF' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#7B61FF' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7B61FF' },
  cardIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#1A1628', marginBottom: 2 },
  cardExpiry: { fontSize: 12, color: '#9CA3AF' },
  deleteBtn: { padding: 4 },

  secureNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4, marginBottom: 8, lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0EDF8',
  },
  payBtn: {
    height: 54, borderRadius: 999, backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
  },
  payBtnLoading: { opacity: 0.7 },
  payBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
