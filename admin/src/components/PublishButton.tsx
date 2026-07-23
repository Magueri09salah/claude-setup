import { Badge, Button, Group, Modal, Text } from "@mantine/core";
import { IconCloudUpload } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { notifyError, notifySuccess } from "../notify";

export function PublishButton() {
  const [version, setVersion] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    api<{ version: number }>("/admin/content-version")
      .then((r) => setVersion(r.version))
      .catch(() => setVersion(null));
  }, []);

  const publish = async () => {
    setPublishing(true);
    try {
      const r = await api<{ version: number }>("/admin/publish", {
        method: "POST",
      });
      setVersion(r.version);
      setOpened(false);
      notifySuccess("تم النشر", `إصدار المحتوى الآن v${r.version}`);
    } catch (e) {
      notifyError(e);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <Group gap="xs">
        {version !== null && (
          <Badge variant="default" c="dimmed">
            v{version}
          </Badge>
        )}
        <Button
          size="sm"
          leftSection={<IconCloudUpload size={16} />}
          onClick={() => setOpened(true)}
        >
          نشر
        </Button>
      </Group>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="نشر المحتوى"
        centered
      >
        <Text size="sm">
          سيرفع هذا إصدار المحتوى
          {version !== null ? ` إلى v${version + 1}` : ""}، وستحمّل تطبيقات
          الهاتف التغييرات عند المزامنة القادمة. هل تريد المتابعة؟
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setOpened(false)}>
            إلغاء
          </Button>
          <Button loading={publishing} onClick={() => void publish()}>
            نشر
          </Button>
        </Group>
      </Modal>
    </>
  );
}
