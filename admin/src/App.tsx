import { Container, Text, Title } from "@mantine/core";

export default function App() {
  return (
    <Container py="xl">
      <Title order={2}>Admin panel</Title>
      <Text c="dimmed" mt="sm">
        Skeleton ready — login, Series, QuestionEditor and Publish arrive in M1.
      </Text>
    </Container>
  );
}
