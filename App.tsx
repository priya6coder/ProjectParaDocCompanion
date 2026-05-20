import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  View,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {
  fetchCommitDiff,
  fetchCurrentReadme,
} from './src/services/githubService';

export default function App() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [sha, setSha] = useState('');

  const [loading, setLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [diffData, setDiffData] = useState('');
  const [readmeData, setReadmeData] = useState('');
  const [error, setError] = useState('');

  const handleFetchData = async () => {
    // Basic validation
    if (!owner || !repo || !sha) {
      setError('Please fill in all three repository fields.');
      return;
    }

    setLoading(true);
    setError('');
    setCommitMessage('');
    setDiffData('');
    setReadmeData('');

    try {
      // 1. Fire off the GitHub API requests
      const commitResult = await fetchCommitDiff(
        owner.trim(),
        repo.trim(),
        sha.trim(),
      );
      const readmeResult = await fetchCurrentReadme(owner.trim(), repo.trim());

      // 2. Update local state with the results
      setCommitMessage(commitResult.message);
      setDiffData(commitResult.diff);
      setReadmeData(readmeResult);
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to fetch data from GitHub. Check your configuration/Token.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e24" />

      <View style={styles.header}>
        <Text style={styles.title}>DocRot Sync</Text>
        <Text style={styles.subtitle}>
          Day 1: GitHub API Integration Handshake
        </Text>
      </View>

      {/* Input Configuration Panel */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>GitHub Owner / Username</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., facebook"
          placeholderTextColor="#666"
          value={owner}
          onChangeText={setOwner}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.inputLabel}>Repository Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., react-native"
          placeholderTextColor="#666"
          value={repo}
          onChangeText={setRepo}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.inputLabel}>Target Commit SHA</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste full alphanumeric commit SHA"
          placeholderTextColor="#666"
          value={sha}
          onChangeText={setSha}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleFetchData}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test Data Handshake</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>❌ {error}</Text> : null}

      {/* Real-time Streaming Logs View */}
      <ScrollView
        style={styles.logScrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {commitMessage ? (
          <View style={styles.logSection}>
            <Text style={styles.sectionLabel}>💬 Commit Intent Message:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{commitMessage}</Text>
            </View>
          </View>
        ) : null}

        {diffData ? (
          <View style={styles.logSection}>
            <Text style={styles.sectionLabel}>🛠️ Extracted Code Diff:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} numberOfLines={15}>
                {diffData}
              </Text>
            </View>
          </View>
        ) : null}

        {readmeData ? (
          <View style={styles.logSection}>
            <Text style={styles.sectionLabel}>
              📄 Existing Remote README.md:
            </Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} numberOfLines={15}>
                {readmeData}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e24',
  },
  header: {
    marginVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#818cf8',
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#26262f',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  inputLabel: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#17171c',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#3730a3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  logScrollView: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  logSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a5b4fc',
    marginBottom: 6,
  },
  codeBox: {
    backgroundColor: '#0f0f11',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d2d39',
  },
  codeText: {
    color: '#34d399',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
