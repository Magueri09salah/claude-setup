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
  IconBrandWhatsapp,
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
  // Files queued for upload in this dialog. Existing pictures are deleted on
  // the spot instead, so the two never need reconciling.
  const [newImages, setNewImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  // Where product orders land. There is NO fallback: empty means the app's
  // order button is disabled (owner decision 2026-09-24).
  const [orderPhone, setOrderPhone] = useState("");
  const [savedOrderPhone, setSavedOrderPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ products: Product[] }>("/admin/products");
      setProducts(r.products);
    } catch (e) {
      notifyError(e);
    }
  }, []);

  const loadPhone = useCallback(async () => {
    try {
      const r = await api<{
        settings: { shopWhatsappNumber: string | null };
      }>("/admin/app-settings");
      setOrderPhone(r.settings.shopWhatsappNumber ?? "");
      setSavedOrderPhone(r.settings.shopWhatsappNumber ?? "");
    } catch (e) {
      notifyError(e);
    }
  }, []);

  const saveOrderPhone = async () => {
    setSavingPhone(true);
    try {
      const r = await api<{
        settings: { shopWhatsappNumber: string | null };
      }>("/admin/app-settings", {
        method: "PUT",
        json: { shopWhatsappNumber: orderPhone.trim() },
      });
      setOrderPhone(r.settings.shopWhatsappNumber ?? "");
      setSavedOrderPhone(r.settings.shopWhatsappNumber ?? "");
      notifySuccess("تم الحفظ", "تم تحديث رقم استقبال الطلبات");
    } catch (e) {
      notifyError(e);
    } finally {
      setSavingPhone(false);
    }
  };

  useEffect(() => {
    void load();
    void loadPhone();
  }, [load, loadPhone]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setNewImages([]);
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
    setNewImages([]);
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
      for (const file of newImages) fd.append("images", file);

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

  /**
   * Delete one picture immediately rather than staging it. The dialog stays
   * open and `editing` is refreshed from the reloaded list, so what you see is
   * always what the server holds.
   */
  const removeImage = async (productId: number, imageId: number) => {
    try {
      await api(`/admin/products/${productId}/images/${imageId}`, {
        method: "DELETE",
      });
      const r = await api<{ products: Product[] }>("/admin/products");
      setProducts(r.products);
      setEditing(r.products.find((p) => p.id === productId) ?? null);
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

      <Card padding="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div style={{ flex: 1, minWidth: 260 }}>
            <TextInput
              label="رقم واتساب لاستقبال الطلبات"
              description="عند الضغط على «اطلبه عبر واتساب» تصل رسالة المترشح إلى هذا الرقم. إلزامي لتفعيل الطلبات."
              placeholder="0612345678"
              dir="ltr"
              styles={{ input: { textAlign: "left" } }}
              leftSection={<IconBrandWhatsapp size={16} color="#25D366" />}
              value={orderPhone}
              onChange={(e) => setOrderPhone(e.currentTarget.value)}
            />
          </div>
          <Button
            loading={savingPhone}
            disabled={orderPhone.trim() === savedOrderPhone}
            onClick={() => void saveOrderPhone()}
          >
            حفظ الرقم
          </Button>
        </Group>
        {!savedOrderPhone && (
          <Text size="xs" c="orange" mt="xs">
            لم يُضبط رقم بعد — زر «اطلبه عبر واتساب» معطّل في التطبيق حتى
            تضيف رقماً هنا.
          </Text>
        )}
      </Card>

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
                {p.images[0] ? (
                  <Image
                    src={mediaUrl(p.images[0].url)}
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
          {/* Existing pictures, deletable one by one. The first is the cover. */}
          {editing && editing.images.length > 0 && (
            <div>
              <Text size="sm" fw={500} mb={4}>
                الصور الحالية ({editing.images.length})
              </Text>
              <Text size="xs" c="dimmed" mb="xs">
                الصورة الأولى هي التي تظهر على بطاقة المنتج في التطبيق.
              </Text>
              <Group gap="xs">
                {editing.images.map((img, i) => (
                  <div key={img.id} style={{ position: "relative" }}>
                    <Image
                      src={mediaUrl(img.url)}
                      w={84}
                      h={84}
                      fit="cover"
                      radius="sm"
                    />
                    {i === 0 && (
                      <Badge
                        size="xs"
                        variant="filled"
                        style={{ position: "absolute", bottom: 4, insetInlineStart: 4 }}
                      >
                        الغلاف
                      </Badge>
                    )}
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="filled"
                      aria-label="حذف الصورة"
                      style={{ position: "absolute", top: 2, insetInlineEnd: 2 }}
                      onClick={() => void removeImage(editing.id, img.id)}
                    >
                      <IconTrash size={13} />
                    </ActionIcon>
                  </div>
                ))}
              </Group>
            </div>
          )}

          <FileInput
            multiple
            label={editing ? "إضافة صور (اختياري)" : "صور المنتج"}
            description="يمكن اختيار عدة صور مرة واحدة — 8 صور كحد أقصى لكل منتج"
            placeholder="webp / png / jpg — 5 ميغا لكل صورة"
            accept="image/webp,image/png,image/jpeg"
            leftSection={<IconPhoto size={16} />}
            value={newImages}
            onChange={setNewImages}
            clearable
          />
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
