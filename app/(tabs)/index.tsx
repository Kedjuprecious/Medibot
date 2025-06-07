import { Image, StyleSheet, Text, View } from 'react-native';

export default function DashboardHome() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, John</Text>
        <Image source={{ uri: 'https://i.pravatar.cc/100' }} style={styles.avatar} />
      </View>
      <Text style={styles.info}>Let’s begin your health journey today 💙</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004AAD',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  info: {
    marginTop: 20,
    fontSize: 16,
    color: '#555',
  },
});