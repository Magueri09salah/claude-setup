import {
  ActionIcon,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Image,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconPencil,
  IconPhoto,
  IconPlus,
  IconShoppingBag,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api, mediaUrl } from "../api/client";
import type { Product } from "../api/types";
import { notifyError, notifySuccess } from "../notify";

const EMPTY = { title: "", description: "", price: 0, isActive: true };

// المتجر — products the school sells. No cart, no stock: a picture, a
// description and a price; the candidate buys over WhatsApp.
export function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ products: Product[] }>("/admin/products");
      setProducts(r.products);
    } catch (e) {
      notifyError(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setImage(null);
    setModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description ?? "",
      price: p.price,
      isActive: p.isActive,
    });
    setImage(null);
    setModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      notifyError(new Error("اسم المنتج مطلوب"));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("price", String(form.price));
      fd.append("isActive", String(form.isActive));
      if (image) fd.append("image", image);

      if (editing) {
        await api(`/admin/products/${editing.id}`, { method: "PATCH", formData: fd });
        notifySuccess("تم الحفظ", `حُدّث المنتج «${form.title.trim()}»`);
      } else {
        await api("/admin/products", { method: "POST", formData: fd });
        notifySuccess("تمت الإضافة", `أُضيف المنتج «${form.title.trim()}»`);
      }
      setModal(false);
      await load();
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  // Quick hide/show without opening the form — the common case for sold-out.
  const toggleActive = async (p: Product) => {
    try {
      const fd = new FormData();
      fd.append("isActive", String(!p.isActive));
      await api(`/admin/products/${p.id}`, { method: "PATCH", formData: fd });
      await load();
    } catch (e) {
      notifyError(e);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/admin/products/${deleteTarget.id}`, { method: "DELETE" });
      notifySuccess("تم الحذف", `حُذف المنتج «${deleteTarget.title}»`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      notifyError(e);
    }
  };

  const visible = products.filter((p) => p.isActive).length;

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>المتجر</Title>
          <Text c="dimmed" size="sm">
            {products.length} منتجاً · {visible} ظاهر في التطبيق
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          إضافة منتج
        </Button>
      </Group>

      {products.length === 0 ? (
        <Card padding="xl">
          <Stack align="center" gap="xs">
            <IconShoppingBag size={32} stroke={1.5} color="var(--zinc-500)" />
            <Text c="dimmed">لا توجد منتجات بعد — أضف أول منتج.</Text>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {products.map((p) => (
            <Card key={p.id} padding="md" style={{ opacity: p.isActive ? 1 : 0.55 }}>
              <Card.Section>
                {p.imageUrl ? (
                  <Image
                    src={mediaUrl(p.imageUrl)}
                    h={170}
                    fit="cover"
                    alt={p.title}
                  />
                ) : (
                  <Group h={170} justify="center" bg="var(--zinc-100)">
                    <IconPhoto size={28} stroke={1.5} color="var(--zinc-500)" />
                  </Group>
                )}
              </Card.Section>

              <Group justify="space-between" mt="sm" wrap="nowrap">
                <Text fw={600} lineClamp={1}>
                  {p.title}
                </Text>
                <Badge color="yellow" variant="light" style={{ flexShrink: 0 }}>
                  {p.price.toLocaleString("ar-MA")} درهم
                </Badge>
              </Group>

              {p.description && (
                <Text size="xs" c="dimmed" mt={4} lineClamp={2}>
                  {p.description}
                </Text>
              )}

              <Group justify="space-between" mt="md">
                <Switch
                  size="sm"
                  checked={p.isActive}
                  onChange={() => void toggleActive(p)}
                  label={p.isActive ? "ظاهر" : "مخفي"}
                />
                <Group gap={4}>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => openEdit(p)}
                    title="تعديل"
                  >
                    <IconPencil size={17} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => setDeleteTarget(p)}
                    title="حذف"
                  >
                    <IconTrash size={17} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal
        opened={modal}
        onClose={() => setModal(false)}
        title={editing ? "تعديل المنتج" : "منتج جديد"}
        centered
      >
        <Stack>
          <TextInput
            label="اسم المنتج"
            placeholder="مثال: كتاب تعليم السياقة"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.currentTarget.value })}
            maxLength={200}
            required
          />
          <Textarea
            label="الوصف"
            placeholder="وصف مختصر للمنتج"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.currentTarget.value })
            }
            autosize
            minRows={3}
            maxLength={2000}
          />
          <NumberInput
            label="الثمن (درهم)"
            value={form.price}
            onChange={(v) => setForm({ ...form, price: Number(v) || 0 })}
            min={0}
            max={1000000}
            decimalScale={2}
            thousandSeparator=" "
          />
          <FileInput
            label={editing ? "تغيير الصورة (اختياري)" : "صورة المنتج"}
            placeholder="webp / png / jpg — 5 ميغا كحد أقصى"
            accept="image/webp,image/png,image/jpeg"
            leftSection={<IconPhoto size={16} />}
            value={image}
            onChange={setImage}
            clearable
          />
          {editing?.imageUrl && !image && (
            <Image src={mediaUrl(editing.imageUrl)} h={120} fit="contain" />
          )}
          <Switch
            label="ظاهر في التطبيق"
            checked={form.isActive}
            onChange={(e) =>
              setForm({ ...form, isActive: e.currentTarget.checked })
            }
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModal(false)}>
              إلغاء
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              حفظ
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف المنتج"
        centered
      >
        <Stack>
          <Text size="sm">
            سيُحذف المنتج «{deleteTarget?.title}» نهائياً. لا يمكن التراجع.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </Button>
            <Button color="red" onClick={() => void remove()}>
              حذف
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
