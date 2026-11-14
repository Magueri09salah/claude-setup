import {
  ActionIcon,
  Anchor,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  FileButton,
  Group,
  Image,
  Modal,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconBook2,
  IconChevronLeft,
  IconFolder,
  IconFolderPlus,
  IconPencil,
  IconPhoto,
  IconTrash,
  IconVideo,
  IconVideoPlus,
  IconVolume,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { api, mediaUrl, uploadWithProgress } from "../api/client";
import type {
  Category,
  Lesson,
  LessonKind,
  LessonVideo,
  Sign,
} from "../api/types";
import { notifyError, notifySuccess } from "../notify";

/** Human size for the video table — bytes are meaningless at this scale. */
function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024
    ? `${(mb / 1024).toFixed(1)} غ.ب`
    : `${mb.toFixed(1)} م.ب`;
}

// Three drill-down PAGES, mirroring the mobile app and the owner's sketch
// (2026-08-07): الفئات grid → numbered الدروس grid → العلامات content.
// The previous three-columns-at-once layout did not match what the candidate
// actually walks through, which made the content hierarchy hard to picture.
export function LessonsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  // Breadcrumb trail of categories; empty = the top-level grid.
  const [path, setPath] = useState<Category[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  // category modal
  const [catModal, setCatModal] = useState(false);
  const [catTitle, setCatTitle] = useState("");
  const [catPremium, setCatPremium] = useState(false);

  // videos of the open VIDEOS-kind lesson
  const [videos, setVideos] = useState<LessonVideo[]>([]);
  const [videoModal, setVideoModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [deleteVideo, setDeleteVideo] = useState<LessonVideo | null>(null);

  // lesson modal
  const [lessonModal, setLessonModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonKind, setLessonKind] = useState<LessonKind>("SIGNS");
  // The cover can't be uploaded before the lesson exists (the storage key is
  // lessons/<id>/cover), so the file is held here and sent right after create.
  const [lessonCover, setLessonCover] = useState<File | null>(null);
  const [lessonCoverPreview, setLessonCoverPreview] = useState<string | null>(null);
  // Signed thumbnail urls for lesson covers, keyed by imageKey.
  const [lessonThumbs, setLessonThumbs] = useState<Record<string, string>>({});

  // sign modal
  const [signModal, setSignModal] = useState(false);
  const [name, setName] = useState("");
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sign | null>(null);

  // Checkbox selections for bulk delete (owner request 2026-11-14): folders on
  // page 1 (and legacy sub-folders on page 2), lessons on page 2.
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [bulkDelete, setBulkDelete] = useState<"cats" | "lessons" | null>(null);
  const [deleting, setDeleting] = useState(false);

  // EDIT MODE (owner request 2026-11-14, typos at every level): the create
  // modals double as edit modals. null = the modal creates; a row = it edits
  // that row through the PATCH routes the API already had.
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  // Editing only: the admin pressed «إزالة» on the lesson's EXISTING cover.
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [editSign, setEditSign] = useState<Sign | null>(null);
  // Signed url of the sign picture shown in the modal (current or just uploaded).
  const [signPreview, setSignPreview] = useState<string | null>(null);
  const [editVideo, setEditVideo] = useState<LessonVideo | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");

  const currentCat = path.length > 0 ? path[path.length - 1]! : null;

  // A selection belongs to the page it was made on — never carry ticks into
  // another folder, where they would delete things the admin cannot see.
  useEffect(() => {
    setSelectedCats([]);
    setSelectedLessons([]);
  }, [currentCat, selectedLesson]);

  const loadCategories = useCallback(async () => {
    try {
      const r = await api<{ categories: Category[] }>("/admin/categories");
      setCategories(r.categories);
    } catch (e) {
      notifyError(e);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const loadLessons = useCallback(async (categoryId: number) => {
    try {
      const r = await api<{ lessons: Lesson[] }>(
        `/admin/lessons?categoryId=${categoryId}`,
      );
      setLessons(r.lessons);
      const keys = r.lessons
        .map((l) => l.imageKey)
        .filter((k): k is string => !!k);
      if (keys.length > 0) {
        const u = await api<{ urls: Record<string, string> }>(
          "/admin/media-urls",
          { method: "POST", json: { keys } },
        );
        setLessonThumbs(u.urls);
      } else {
        setLessonThumbs({});
      }
    } catch (e) {
      notifyError(e);
    }
  }, []);

  // Whenever the current category changes, its lessons come with it.
  useEffect(() => {
    if (currentCat) void loadLessons(currentCat.id);
    else setLessons([]);
  }, [currentCat, loadLessons]);

  const loadSigns = useCallback(async (lesson: Lesson) => {
    try {
      const r = await api<{ signs: Sign[] }>(`/admin/lessons/${lesson.id}/signs`);
      setSigns(r.signs);
      const keys = r.signs.map((s) => s.imageKey);
      if (keys.length > 0) {
        const u = await api<{ urls: Record<string, string> }>(
          "/admin/media-urls",
          { method: "POST", json: { keys } },
        );
        setThumbs(u.urls);
      } else {
        setThumbs({});
      }
    } catch (e) {
      notifyError(e);
    }
  }, []);

  const loadVideos = useCallback(async (lessonId: number) => {
    try {
      const r = await api<{ videos: LessonVideo[] }>(
        `/admin/lessons/${lessonId}/videos`,
      );
      setVideos(r.videos);
    } catch (e) {
      notifyError(e);
    }
  }, []);

  const openLesson = (l: Lesson) => {
    setSelectedLesson(l);
    setSigns([]);
    setVideos([]);
    if (l.kind === "VIDEOS") void loadVideos(l.id);
    else void loadSigns(l);
  };

  const resetSignForm = () => {
    setName("");
    setImageKey(null);
    setAudioKey(null);
    setSignPreview(null);
  };

  // ---- create -------------------------------------------------------------

  const openCatModal = () => {
    setEditCat(null);
    setCatTitle("");
    setCatPremium(false);
    setCatModal(true);
  };

  const openEditCat = (c: Category) => {
    setEditCat(c);
    setCatTitle(c.title);
    setCatPremium(c.isPremium);
    setCatModal(true);
  };

  const saveCategory = async () => {
    if (!editCat || !catTitle.trim()) return;
    setSaving(true);
    try {
      await api(`/admin/categories/${editCat.id}`, {
        method: "PATCH",
        json: { title: catTitle.trim(), isPremium: catPremium },
      });
      notifySuccess("تم الحفظ", "عُدّلت الفئة — اضغط «نشر» لتحديث التطبيقات");
      setCatModal(false);
      await loadCategories();
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async () => {
    if (!catTitle.trim()) return;
    setSaving(true);
    try {
      await api("/admin/categories", {
        method: "POST",
        json: {
          title: catTitle.trim(),
          // Always top-level: the model is فئة → درس → علامة, with no
          // sub-category layer (owner, 2026-08-07).
          parentId: null,
          isPremium: catPremium,
        },
      });
      notifySuccess("تم الإنشاء", "تمت إضافة الفئة");
      setCatModal(false);
      await loadCategories();
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const pickLessonCover = (file: File | null) => {
    setLessonCover(file);
    setLessonCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const openLessonModal = () => {
    setEditLesson(null);
    setCoverRemoved(false);
    setLessonTitle("");
    setLessonKind("SIGNS");
    pickLessonCover(null);
    setLessonModal(true);
  };

  const openEditLesson = (l: Lesson) => {
    setEditLesson(l);
    setCoverRemoved(false);
    setLessonTitle(l.title);
    setLessonKind(l.kind);
    pickLessonCover(null);
    setLessonModal(true);
  };

  const saveLesson = async () => {
    if (!editLesson || !lessonTitle.trim()) return;
    setSaving(true);
    try {
      // undefined = leave the cover alone; null = remove it; a key = replace it.
      // Unlike create, a failed upload fails the save: the admin asked for a
      // new picture and must not be told «تم الحفظ» without it.
      let imageKey: string | null | undefined;
      if (lessonCover) {
        const fd = new FormData();
        fd.append("lessonId", String(editLesson.id));
        fd.append("purpose", "cover");
        fd.append("file", lessonCover);
        const up = await api<{ key: string }>("/admin/upload", {
          method: "POST",
          formData: fd,
        });
        imageKey = up.key;
      } else if (coverRemoved && editLesson.imageKey) {
        imageKey = null;
      }
      await api(`/admin/lessons/${editLesson.id}`, {
        method: "PATCH",
        json: {
          title: lessonTitle.trim(),
          ...(imageKey !== undefined ? { imageKey } : {}),
        },
      });
      notifySuccess("تم الحفظ", "عُدّل الدرس — اضغط «نشر» لتحديث التطبيقات");
      setLessonModal(false);
      pickLessonCover(null);
      if (currentCat) await loadLessons(currentCat.id);
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const createLesson = async () => {
    if (!currentCat || !lessonTitle.trim()) return;
    setSaving(true);
    try {
      const created = await api<{ lesson: Lesson }>("/admin/lessons", {
        method: "POST",
        json: {
          categoryId: currentCat.id,
          title: lessonTitle.trim(),
          kind: lessonKind,
        },
      });
      // Cover second: it needs the id the create call just returned. A failure
      // here leaves a perfectly usable lesson without a picture, so it must not
      // fail the whole operation.
      if (lessonCover) {
        try {
          const fd = new FormData();
          fd.append("lessonId", String(created.lesson.id));
          fd.append("purpose", "cover");
          fd.append("file", lessonCover);
          const up = await api<{ key: string }>("/admin/upload", {
            method: "POST",
            formData: fd,
          });
          await api(`/admin/lessons/${created.lesson.id}`, {
            method: "PATCH",
            json: { imageKey: up.key },
          });
        } catch (e) {
          notifyError(e);
        }
      }
      notifySuccess("تم الإنشاء", "تمت إضافة الدرس");
      setLessonModal(false);
      pickLessonCover(null);
      await Promise.all([loadLessons(currentCat.id), loadCategories()]);
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const openSignModal = () => {
    setEditSign(null);
    resetSignForm();
    setSignModal(true);
  };

  const openEditSign = (s: Sign) => {
    setEditSign(s);
    setName(s.name);
    setImageKey(s.imageKey);
    setAudioKey(s.audioKey ?? null);
    setSignPreview(thumbs[s.imageKey] ?? null);
    setSignModal(true);
  };

  const saveSign = async () => {
    if (!editSign || !selectedLesson || !name.trim() || !imageKey) return;
    setSaving(true);
    try {
      await api(`/admin/signs/${editSign.id}`, {
        method: "PATCH",
        json: { name: name.trim(), imageKey, audioKey: audioKey ?? null },
      });
      notifySuccess("تم الحفظ", `عُدّلت العلامة «${name.trim()}»`);
      setSignModal(false);
      await loadSigns(selectedLesson);
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const openEditVideo = (v: LessonVideo) => {
    setEditVideo(v);
    setEditVideoTitle(v.title);
  };

  const saveVideo = async () => {
    if (!editVideo || !selectedLesson || !editVideoTitle.trim()) return;
    setSaving(true);
    try {
      await api(`/admin/videos/${editVideo.id}`, {
        method: "PATCH",
        json: { title: editVideoTitle.trim() },
      });
      notifySuccess("تم الحفظ", "عُدّل عنوان الفيديو");
      setEditVideo(null);
      await loadVideos(selectedLesson.id);
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const openVideoModal = () => {
    setVideoTitle("");
    setVideoFile(null);
    setVideoProgress(null);
    setVideoModal(true);
  };

  const addVideo = async () => {
    if (!selectedLesson || !videoTitle.trim() || !videoFile) return;
    setVideoProgress(0);
    try {
      const fd = new FormData();
      fd.append("title", videoTitle.trim());
      fd.append("file", videoFile);
      await uploadWithProgress(
        `/admin/lessons/${selectedLesson.id}/videos`,
        fd,
        setVideoProgress,
      );
      notifySuccess("تم الرفع", `أُضيف الفيديو «${videoTitle.trim()}»`);
      setVideoModal(false);
      await Promise.all([
        loadVideos(selectedLesson.id),
        currentCat ? loadLessons(currentCat.id) : Promise.resolve(),
      ]);
    } catch (e) {
      notifyError(e);
    } finally {
      setVideoProgress(null);
    }
  };

  const moveVideo = async (index: number, delta: -1 | 1) => {
    if (!selectedLesson) return;
    const target = index + delta;
    if (target < 0 || target >= videos.length) return;
    const next = [...videos];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    setVideos(next);
    try {
      await api(`/admin/lessons/${selectedLesson.id}/videos/reorder`, {
        method: "POST",
        json: { orderedIds: next.map((v) => v.id) },
      });
    } catch (e) {
      notifyError(e);
      await loadVideos(selectedLesson.id);
    }
  };

  const removeVideo = async () => {
    if (!deleteVideo || !selectedLesson) return;
    try {
      await api(`/admin/videos/${deleteVideo.id}`, { method: "DELETE" });
      setDeleteVideo(null);
      notifySuccess("تم الحذف", "حُذف الفيديو");
      await Promise.all([
        loadVideos(selectedLesson.id),
        currentCat ? loadLessons(currentCat.id) : Promise.resolve(),
      ]);
    } catch (e) {
      notifyError(e);
    }
  };

  const upload = async (file: File | null, kind: "image" | "audio") => {
    if (!file || !selectedLesson) return;
    const setBusy = kind === "image" ? setUploadingImage : setUploadingAudio;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("lessonId", String(selectedLesson.id));
      // Editing re-uses the sign's own slot; the server still never overwrites
      // (it hands out _v2, _v3 …), so phones cannot keep a stale cached file.
      fd.append("slot", String(editSign ? editSign.orderNum : signs.length + 1));
      fd.append("file", file);
      const r = await api<{ key: string; url: string }>("/admin/upload", {
        method: "POST",
        formData: fd,
      });
      if (kind === "image") {
        setImageKey(r.key);
        setSignPreview(r.url);
      } else setAudioKey(r.key);
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };

  const addSign = async () => {
    if (!selectedLesson || !name.trim() || !imageKey) return;
    setSaving(true);
    try {
      await api(`/admin/lessons/${selectedLesson.id}/signs`, {
        method: "POST",
        json: { name: name.trim(), imageKey, audioKey: audioKey ?? null },
      });
      notifySuccess("تمت الإضافة", `أُضيفت العلامة «${name.trim()}»`);
      setSignModal(false);
      await loadSigns(selectedLesson);
      if (currentCat) void loadLessons(currentCat.id);
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    if (!selectedLesson) return;
    const target = index + delta;
    if (target < 0 || target >= signs.length) return;
    const next = [...signs];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    setSigns(next);
    try {
      await api(`/admin/lessons/${selectedLesson.id}/signs/reorder`, {
        method: "POST",
        json: { orderedIds: next.map((s) => s.id) },
      });
    } catch (e) {
      notifyError(e);
      await loadSigns(selectedLesson);
    }
  };

  const deleteSign = async () => {
    if (!deleteTarget || !selectedLesson) return;
    try {
      await api(`/admin/signs/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      notifySuccess("تم الحذف", "حُذفت العلامة");
      await loadSigns(selectedLesson);
      if (currentCat) void loadLessons(currentCat.id);
    } catch (e) {
      notifyError(e);
    }
  };

  // ---- derived ------------------------------------------------------------

  const childrenOf = (id: number | null) =>
    categories.filter((c) => (c.parentId ?? null) === id);
  const visibleCats = childrenOf(currentCat?.id ?? null);

  // ---- bulk delete ----------------------------------------------------------

  const toggleIn =
    (set: (fn: (prev: number[]) => number[]) => void) =>
    (id: number, on: boolean) =>
      set((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));
  const toggleCat = toggleIn(setSelectedCats);
  const toggleLesson = toggleIn(setSelectedLessons);

  // What a folder delete really takes with it: the server also removes legacy
  // sub-folders and their lessons, so the confirm counts them too.
  const catsBeingDeleted = (() => {
    const all = new Set(selectedCats);
    let frontier = selectedCats;
    while (frontier.length > 0) {
      frontier = categories
        .filter((c) => c.parentId != null && frontier.includes(c.parentId))
        .map((c) => c.id)
        .filter((id) => !all.has(id));
      for (const id of frontier) all.add(id);
    }
    return categories.filter((c) => all.has(c.id));
  })();
  const lessonsInDeletedCats = catsBeingDeleted.reduce(
    (n, c) => n + (c._count?.lessons ?? 0),
    0,
  );
  const lessonsBeingDeleted = lessons.filter((l) =>
    selectedLessons.includes(l.id),
  );
  const signsInDeletedLessons = lessonsBeingDeleted.reduce(
    (n, l) => n + (l._count?.signs ?? 0),
    0,
  );
  const videosInDeletedLessons = lessonsBeingDeleted.reduce(
    (n, l) => n + (l._count?.videos ?? 0),
    0,
  );

  const removeSelected = async () => {
    if (!bulkDelete) return;
    setDeleting(true);
    try {
      if (bulkDelete === "cats") {
        const r = await api<{ categories: number; lessons: number }>(
          "/admin/categories/delete",
          { method: "POST", json: { ids: selectedCats } },
        );
        notifySuccess(
          "تم الحذف",
          `حُذفت ${r.categories} فئة و${r.lessons} درس — اضغط «نشر» لتحديث التطبيقات`,
        );
        setSelectedCats([]);
      } else {
        const r = await api<{ deleted: number }>("/admin/lessons/delete", {
          method: "POST",
          json: { ids: selectedLessons },
        });
        notifySuccess(
          "تم الحذف",
          `حُذف ${r.deleted} درس — اضغط «نشر» لتحديث التطبيقات`,
        );
        setSelectedLessons([]);
        if (currentCat) await loadLessons(currentCat.id);
      }
      setBulkDelete(null);
      // Folder cards show lesson counts, so both deletes refresh them.
      await loadCategories();
    } catch (e) {
      notifyError(e);
    } finally {
      setDeleting(false);
    }
  };

  // The lesson modal's picture: a freshly picked file first, else (editing) the
  // lesson's current cover unless the admin pressed «إزالة» on it.
  const lessonCoverShown =
    lessonCoverPreview ??
    (editLesson && !coverRemoved && editLesson.imageKey
      ? mediaUrl(lessonThumbs[editLesson.imageKey])
      : undefined) ??
    null;

  // ---- breadcrumb ---------------------------------------------------------

  const crumbs = [
    <Anchor
      key="root"
      onClick={() => {
        setPath([]);
        setSelectedLesson(null);
      }}
    >
      الفئات
    </Anchor>,
    ...path.map((c, i) => (
      <Anchor
        key={c.id}
        onClick={() => {
          setPath(path.slice(0, i + 1));
          setSelectedLesson(null);
        }}
      >
        {c.title}
      </Anchor>
    )),
    ...(selectedLesson
      ? [
          <Text key="lesson" size="sm" fw={600}>
            {selectedLesson.title}
          </Text>,
        ]
      : []),
  ];

  const goBack = () => {
    if (selectedLesson) setSelectedLesson(null);
    else setPath(path.slice(0, -1));
  };

  // Exactly three levels (owner, 2026-08-07): الفئة → الدرس → العلامة.
  const level = selectedLesson
    ? { title: "العلامات", hint: `علامات درس «${selectedLesson.title}»` }
    : currentCat
      ? { title: "الدروس", hint: `دروس فئة «${currentCat.title}»` }
      : { title: "الفئات", hint: "اختر فئة لعرض دروسها" };

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>{level.title}</Title>
          <Text c="dimmed" size="sm">
            {level.hint}
          </Text>
        </div>
        <Group>
          {(path.length > 0 || selectedLesson) && (
            <Button
              variant="default"
              leftSection={<IconChevronLeft size={16} />}
              onClick={goBack}
            >
              رجوع
            </Button>
          )}
          {/* One "add" per level — the button always creates the thing the
              page is showing, so the hierarchy can't be entered wrongly. */}
          {!currentCat && !selectedLesson && (
            <Button
              leftSection={<IconFolderPlus size={16} />}
              onClick={openCatModal}
            >
              فئة جديدة
            </Button>
          )}
          {currentCat && !selectedLesson && (
            <Button onClick={openLessonModal}>درس جديد</Button>
          )}
          {selectedLesson &&
            (selectedLesson.kind === "VIDEOS" ? (
              <Button
                leftSection={<IconVideoPlus size={16} />}
                onClick={openVideoModal}
              >
                فيديو جديد
              </Button>
            ) : (
              <Button onClick={openSignModal}>علامة جديدة</Button>
            ))}
        </Group>
      </Group>

      {/* The owner's own example, kept on screen so the three levels are never
          mixed up again: الفئة التشوير → الدرس علامات الإجبار → العلامة. */}
      <Card padding="sm" bg="var(--zinc-50)">
        <Group gap="xs" wrap="wrap">
          <Badge variant={path.length === 0 ? "filled" : "light"} color="blue">
            1. الفئة
          </Badge>
          <Text size="xs" c="dimmed">
            مثل «التشوير»
          </Text>
          <IconChevronLeft size={13} color="var(--zinc-400)" />
          <Badge
            variant={currentCat && !selectedLesson ? "filled" : "light"}
            color="grape"
          >
            2. الدرس
          </Badge>
          <Text size="xs" c="dimmed">
            مثل «علامات الإجبار»
          </Text>
          <IconChevronLeft size={13} color="var(--zinc-400)" />
          <Badge variant={selectedLesson ? "filled" : "light"} color="teal">
            3. العلامة
          </Badge>
          <Text size="xs" c="dimmed">
            مثل «ممنوع تجاوز 60 كلم»
          </Text>
        </Group>
      </Card>

      <Breadcrumbs separator="‹">{crumbs}</Breadcrumbs>

      {/* ---------------- PAGE 3a: videos of a VIDEOS lesson ---------------- */}
      {selectedLesson && selectedLesson.kind === "VIDEOS" ? (
        videos.length === 0 ? (
          <Card padding="xl">
            <Stack align="center" gap="xs">
              <IconVideo size={32} color="var(--zinc-400)" />
              <Text c="dimmed">لا توجد فيديوهات بعد — اضغط «فيديو جديد».</Text>
            </Stack>
          </Card>
        ) : (
          <Card padding="lg">
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={50}>#</Table.Th>
                  <Table.Th>العنوان</Table.Th>
                  <Table.Th w={110}>الحجم</Table.Th>
                  <Table.Th w={140}>إجراءات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {videos.map((v, i) => (
                  <Table.Tr key={v.id}>
                    <Table.Td>{i + 1}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <IconVideo size={16} color="var(--zinc-500)" />
                        <Text size="sm">{v.title}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {formatBytes(v.sizeBytes)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          disabled={i === 0}
                          aria-label="تحريك لأعلى"
                          onClick={() => void moveVideo(i, -1)}
                        >
                          ↑
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          disabled={i === videos.length - 1}
                          aria-label="تحريك لأسفل"
                          onClick={() => void moveVideo(i, 1)}
                        >
                          ↓
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label="تعديل"
                          onClick={() => openEditVideo(v)}
                        >
                          <IconPencil size={15} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label="حذف"
                          onClick={() => setDeleteVideo(v)}
                        >
                          ✕
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )
      ) : /* ---------------- PAGE 3b: signs of a lesson ---------------- */
      selectedLesson ? (
        signs.length === 0 ? (
          <Card padding="xl">
            <Stack align="center" gap="xs">
              <IconPhoto size={32} color="var(--zinc-400)" />
              <Text c="dimmed">لا توجد علامات بعد — اضغط «+ علامة».</Text>
            </Stack>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md">
            {signs.map((s, i) => (
              <Card key={s.id} padding="sm">
                <Card.Section>
                  <Image
                    src={mediaUrl(thumbs[s.imageKey])}
                    h={120}
                    fit="contain"
                    bg="var(--zinc-100)"
                  />
                </Card.Section>
                <Group justify="space-between" mt="xs" wrap="nowrap">
                  <Badge size="sm" variant="light">
                    {s.orderNum}
                  </Badge>
                  {s.audioKey && <IconVolume size={15} color="var(--zinc-500)" />}
                </Group>
                <Text size="sm" fw={500} lineClamp={2} mt={4}>
                  {s.name}
                </Text>
                <Group gap={2} mt="xs" wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    disabled={i === 0}
                    aria-label="تحريك لليمين"
                    onClick={() => void move(i, -1)}
                  >
                    →
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    disabled={i === signs.length - 1}
                    aria-label="تحريك لليسار"
                    onClick={() => void move(i, 1)}
                  >
                    ←
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="gray"
                    aria-label="تعديل"
                    onClick={() => openEditSign(s)}
                  >
                    <IconPencil size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="red"
                    aria-label="حذف"
                    onClick={() => setDeleteTarget(s)}
                  >
                    ✕
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )
      ) : (
        <>
          {/* ---------------- PAGE 1/2: categories grid ---------------- */}
          {currentCat && visibleCats.length > 0 && (
            <Card padding="sm" bg="var(--mantine-color-yellow-0)">
              <Text size="xs">
                <b>أقسام فرعية قديمة.</b> النموذج الآن ثلاث مستويات فقط
                (فئة ← درس ← علامة)، وهذه الأقسام أُنشئت قبل ذلك. دروسها ما زالت
                تعمل — اضغط عليها للوصول إليها. يُفضَّل نقل دروسها إلى الفئة
                الأم ثم حذفها.
              </Text>
            </Card>
          )}
          {visibleCats.length > 0 && (
            <SelectionBar
              total={visibleCats.length}
              selected={selectedCats.length}
              onToggleAll={(on) =>
                setSelectedCats(on ? visibleCats.map((c) => c.id) : [])
              }
              onDelete={() => setBulkDelete("cats")}
            />
          )}
          {visibleCats.length > 0 && (
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
              {visibleCats.map((c) => (
                <Card
                  key={c.id}
                  padding="lg"
                  style={{ cursor: "pointer" }}
                  bg={
                    selectedCats.includes(c.id)
                      ? "var(--mantine-color-red-light)"
                      : undefined
                  }
                  onClick={() => setPath([...path, c])}
                >
                  <Group justify="space-between" align="flex-start">
                    <IconFolder size={22} color="var(--zinc-500)" stroke={1.75} />
                    <Group gap="xs">
                      {c.isPremium && (
                        <Badge size="sm" color="grape" variant="light">
                          مدفوع
                        </Badge>
                      )}
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        color="gray"
                        aria-label={`تعديل «${c.title}»`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCat(c);
                        }}
                      >
                        <IconPencil size={15} />
                      </ActionIcon>
                      <SelectBox
                        label={`تحديد «${c.title}»`}
                        checked={selectedCats.includes(c.id)}
                        onChange={(on) => toggleCat(c.id, on)}
                      />
                    </Group>
                  </Group>
                  <Text fw={600} mt="sm" lineClamp={2}>
                    {c.title}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {c._count?.children ? `${c._count.children} قسم · ` : ""}
                    {c._count?.lessons ?? 0} درس
                  </Text>
                </Card>
              ))}
            </SimpleGrid>
          )}

          {/* ---------------- PAGE 2: numbered lessons ---------------- */}
          {currentCat && lessons.length > 0 && (
            <>
              <Text fw={600} fz="sm" mt="md">
                الدروس
              </Text>
              <SelectionBar
                total={lessons.length}
                selected={selectedLessons.length}
                onToggleAll={(on) =>
                  setSelectedLessons(on ? lessons.map((l) => l.id) : [])
                }
                onDelete={() => setBulkDelete("lessons")}
              />
              <SimpleGrid cols={{ base: 3, sm: 4, lg: 6 }} spacing="md">
                {lessons.map((l) => (
                  <Card
                    key={l.id}
                    padding="md"
                    style={{
                      cursor: "pointer",
                      textAlign: "center",
                      position: "relative",
                    }}
                    bg={
                      selectedLessons.includes(l.id)
                        ? "var(--mantine-color-red-light)"
                        : undefined
                    }
                    onClick={() => openLesson(l)}
                  >
                    {/* Mirrors the app: the cover IS the card (owner sketch). */}
                    <Card.Section>
                      {l.imageKey && lessonThumbs[l.imageKey] ? (
                        <Image
                          src={mediaUrl(lessonThumbs[l.imageKey])}
                          h={96}
                          fit="contain"
                          bg="var(--zinc-100)"
                        />
                      ) : (
                        <Group h={96} justify="center" bg="var(--zinc-100)">
                          <IconPhoto size={26} color="var(--zinc-400)" />
                        </Group>
                      )}
                    </Card.Section>
                    <Text size="sm" fw={600} lineClamp={2} mt="sm">
                      {l.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {l._count?.signs ?? 0} علامة
                    </Text>
                    {/* LAST child on purpose: Mantine only bleeds a Card.Section
                        to the top edge while it is the FIRST child. Absolute,
                        so it still sits over the cover's top-left corner. */}
                    <Group
                      gap={6}
                      wrap="nowrap"
                      style={{ position: "absolute", top: 8, left: 8, zIndex: 1 }}
                    >
                      <ActionIcon
                        variant="default"
                        size="sm"
                        aria-label={`تعديل «${l.title}»`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditLesson(l);
                        }}
                      >
                        <IconPencil size={14} />
                      </ActionIcon>
                      <SelectBox
                        label={`تحديد «${l.title}»`}
                        checked={selectedLessons.includes(l.id)}
                        onChange={(on) => toggleLesson(l.id, on)}
                      />
                    </Group>
                  </Card>
                ))}
              </SimpleGrid>
            </>
          )}

          {visibleCats.length === 0 && (!currentCat || lessons.length === 0) && (
            <Card padding="xl">
              <Stack align="center" gap="xs">
                <IconBook2 size={32} color="var(--zinc-400)" />
                <Text c="dimmed">
                  {currentCat
                    ? "لا توجد دروس في هذه الفئة — اضغط «درس جديد»."
                    : "لا توجد فئات بعد — اضغط «فئة جديدة»."}
                </Text>
              </Stack>
            </Card>
          )}
        </>
      )}

      {/* ---------------- modals ---------------- */}
      <Modal
        opened={videoModal}
        onClose={() => videoProgress === null && setVideoModal(false)}
        title={
          selectedLesson ? `فيديو جديد في «${selectedLesson.title}»` : "فيديو جديد"
        }
        centered
        closeOnClickOutside={videoProgress === null}
      >
        <Stack>
          <TextInput
            label="عنوان الفيديو"
            placeholder="مثل: أجزاء المحرك"
            data-autofocus
            value={videoTitle}
            disabled={videoProgress !== null}
            onChange={(e) => setVideoTitle(e.currentTarget.value)}
          />
          <div>
            <Text size="sm" fw={500} mb={4}>
              ملف الفيديو
            </Text>
            <Text size="xs" c="dimmed" mb="xs">
              MP4 أو MOV، بحد أقصى 500 ميغابايت.
            </Text>
            <Group gap="xs">
              <FileButton onChange={setVideoFile} accept="video/mp4,video/quicktime">
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    size="compact-sm"
                    disabled={videoProgress !== null}
                  >
                    {videoFile ? "تغيير الملف" : "اختيار ملف"}
                  </Button>
                )}
              </FileButton>
              {videoFile && (
                <Text size="xs" c="dimmed">
                  {videoFile.name} · {formatBytes(videoFile.size)}
                </Text>
              )}
            </Group>
          </div>

          {videoProgress !== null && (
            <div>
              <Group justify="space-between" mb={4}>
                <Text size="xs" c="dimmed">
                  {videoProgress >= 1 ? "جارٍ الحفظ…" : "جارٍ الرفع…"}
                </Text>
                <Text size="xs" fw={600}>
                  {Math.round(videoProgress * 100)}%
                </Text>
              </Group>
              <Progress value={videoProgress * 100} animated />
            </div>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={videoProgress !== null}
              onClick={() => setVideoModal(false)}
            >
              إلغاء
            </Button>
            <Button
              loading={videoProgress !== null}
              disabled={!videoTitle.trim() || !videoFile}
              onClick={() => void addVideo()}
            >
              رفع الفيديو
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteVideo !== null}
        onClose={() => setDeleteVideo(null)}
        title="حذف الفيديو"
        centered
      >
        <Text size="sm">
          سيتم حذف «{deleteVideo?.title}» نهائياً. اضغط «نشر» بعد الحذف لتحديث
          التطبيقات.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setDeleteVideo(null)}>
            إلغاء
          </Button>
          <Button color="red" onClick={() => void removeVideo()}>
            حذف نهائي
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={editVideo !== null}
        onClose={() => setEditVideo(null)}
        title="تعديل عنوان الفيديو"
        centered
      >
        <Stack>
          <TextInput
            label="عنوان الفيديو"
            data-autofocus
            value={editVideoTitle}
            onChange={(e) => setEditVideoTitle(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && editVideoTitle.trim()) void saveVideo();
            }}
          />
          <Text size="xs" c="dimmed">
            الفيديو نفسه لا يتغيّر. لاستبداله احذفه ثم ارفع فيديو جديداً.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditVideo(null)}>
              إلغاء
            </Button>
            <Button
              loading={saving}
              disabled={!editVideoTitle.trim()}
              onClick={() => void saveVideo()}
            >
              حفظ
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={catModal}
        onClose={() => setCatModal(false)}
        title={editCat ? `تعديل الفئة «${editCat.title}»` : "فئة جديدة"}
        centered
      >
        <Stack>
          <TextInput
            label="اسم الفئة"
            description="المستوى الأول — مثل: التشوير"
            placeholder="التشوير"
            data-autofocus
            value={catTitle}
            onChange={(e) => setCatTitle(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && catTitle.trim()) {
                void (editCat ? saveCategory() : createCategory());
              }
            }}
          />
          <Checkbox
            label="محتوى مدفوع (مقفل للمستخدمين المجانيين)"
            checked={catPremium}
            onChange={(e) => setCatPremium(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCatModal(false)}>
              إلغاء
            </Button>
            <Button
              loading={saving}
              disabled={!catTitle.trim()}
              onClick={() => void (editCat ? saveCategory() : createCategory())}
            >
              {editCat ? "حفظ" : "إنشاء"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={lessonModal}
        onClose={() => setLessonModal(false)}
        title={
          editLesson
            ? `تعديل الدرس «${editLesson.title}»`
            : currentCat
              ? `درس جديد في «${currentCat.title}»`
              : "درس جديد"
        }
        centered
      >
        <Stack>
          <TextInput
            label="اسم الدرس"
            description="المستوى الثاني — مثل: علامات الإجبار"
            placeholder="علامات الإجبار"
            data-autofocus
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && lessonTitle.trim()) {
                void (editLesson ? saveLesson() : createLesson());
              }
            }}
          />

          <Select
            label="نوع الدرس"
            description="لا يمكن تغييره بعد الإنشاء"
            data={[
              { value: "SIGNS", label: "علامات (صور + أسماء + صوت)" },
              { value: "VIDEOS", label: "فيديوهات" },
            ]}
            value={lessonKind}
            onChange={(v) => v && setLessonKind(v as LessonKind)}
            allowDeselect={false}
            // Signs and videos are different children; the API has no way to
            // change the kind, so the field is shown but frozen when editing.
            disabled={editLesson !== null}
          />

          <div>
            <Text size="sm" fw={500} mb={4}>
              صورة الدرس
            </Text>
            <Text size="xs" c="dimmed" mb="xs">
             تظهر على بطاقة الدرس في التطبيق.
            </Text>
            {lessonCoverShown ? (
              <Image
                src={lessonCoverShown}
                h={140}
                fit="contain"
                radius="sm"
                bg="var(--zinc-100)"
                mb="xs"
              />
            ) : null}
            <Group gap="xs">
              <FileButton
                onChange={pickLessonCover}
                accept="image/webp,image/png,image/jpeg"
              >
                {(props) => (
                  <Button {...props} variant="light" size="compact-sm">
                    {lessonCoverShown ? "تغيير الصورة" : "رفع صورة"}
                  </Button>
                )}
              </FileButton>
              {lessonCoverShown && (
                <Button
                  variant="subtle"
                  color="red"
                  size="compact-sm"
                  // A freshly picked file goes first (back to the current
                  // cover); a second press removes the current cover itself.
                  onClick={() =>
                    lessonCover ? pickLessonCover(null) : setCoverRemoved(true)
                  }
                >
                  إزالة
                </Button>
              )}
            </Group>
          </div>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setLessonModal(false)}>
              إلغاء
            </Button>
            <Button
              loading={saving}
              disabled={!lessonTitle.trim()}
              onClick={() => void (editLesson ? saveLesson() : createLesson())}
            >
              {editLesson ? "حفظ" : "إنشاء"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={signModal}
        onClose={() => setSignModal(false)}
        title={
          editSign
            ? `تعديل العلامة «${editSign.name}»`
            : selectedLesson
              ? `علامة جديدة في «${selectedLesson.title}»`
              : "علامة جديدة"
        }
        centered
      >
        <Stack>
          <TextInput
            label="اسم العلامة"
            description="المستوى الثالث — مثل: ممنوع تجاوز 60 كلم"
            placeholder="ممنوع تجاوز 60 كلم"
            data-autofocus
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          {signPreview && (
            <Image
              src={mediaUrl(signPreview)}
              h={120}
              fit="contain"
              radius="sm"
              bg="var(--zinc-100)"
            />
          )}
          <Group grow align="flex-end">
            <FileButton
              onChange={(f) => void upload(f, "image")}
              accept="image/webp,image/png,image/jpeg"
            >
              {(props) => (
                <Button {...props} variant="light" loading={uploadingImage}>
                  {imageKey ? (editSign ? "تغيير الصورة" : "✓ الصورة") : "رفع صورة *"}
                </Button>
              )}
            </FileButton>
            <FileButton
              onChange={(f) => void upload(f, "audio")}
              accept="audio/mpeg"
            >
              {(props) => (
                <Button {...props} variant="light" loading={uploadingAudio}>
                  {audioKey
                    ? editSign
                      ? "تغيير الصوت"
                      : "✓ الصوت"
                    : "رفع صوت (اختياري)"}
                </Button>
              )}
            </FileButton>
          </Group>
          {audioKey && (
            <Button
              variant="subtle"
              color="red"
              size="compact-sm"
              style={{ alignSelf: "flex-start" }}
              onClick={() => setAudioKey(null)}
            >
              إزالة الصوت
            </Button>
          )}
          <Text size="xs" c="dimmed">
            الصورة إجبارية، والصوت اختياري ويُشغَّل عند الضغط على العلامة في
            التطبيق.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSignModal(false)}>
              إلغاء
            </Button>
            <Button
              loading={saving}
              disabled={
                !name.trim() || !imageKey || uploadingImage || uploadingAudio
              }
              onClick={() => void (editSign ? saveSign() : addSign())}
            >
              {editSign ? "حفظ" : "إضافة العلامة"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="حذف العلامة"
        centered
      >
        <Text size="sm">
          سيتم حذف «{deleteTarget?.name}» نهائياً. اضغط «نشر» بعد الحذف لتحديث
          التطبيقات.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>
            إلغاء
          </Button>
          <Button color="red" onClick={() => void deleteSign()}>
            حذف نهائي
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={bulkDelete !== null}
        onClose={() => !deleting && setBulkDelete(null)}
        title={
          bulkDelete === "cats" ? "حذف الفئات المحددة" : "حذف الدروس المحددة"
        }
        centered
      >
        <Stack gap="sm">
          {bulkDelete === "cats" ? (
            <Text size="sm">
              سيتم حذف {selectedCats.length} فئة نهائياً مع كل ما بداخلها:{" "}
              <b>{lessonsInDeletedCats} درس</b> وكل علاماتها وفيديوهاتها
              {catsBeingDeleted.length > selectedCats.length
                ? `، و${catsBeingDeleted.length - selectedCats.length} قسم فرعي قديم`
                : ""}
              . لا يمكن التراجع عن هذا الإجراء.
            </Text>
          ) : (
            <Text size="sm">
              سيتم حذف {selectedLessons.length} درس نهائياً مع{" "}
              <b>{signsInDeletedLessons} علامة</b> و
              <b>{videosInDeletedLessons} فيديو</b>. لا يمكن التراجع عن هذا
              الإجراء.
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {(bulkDelete === "cats"
              ? catsBeingDeleted.filter((c) => selectedCats.includes(c.id))
              : lessonsBeingDeleted
            )
              .slice(0, 8)
              .map((x) => x.title)
              .join("، ")}
            {(bulkDelete === "cats" ? selectedCats : selectedLessons).length > 8
              ? " …"
              : ""}
          </Text>
          <Text size="xs" c="dimmed">
            اضغط «نشر» بعد الحذف لتحديث التطبيقات.
          </Text>
        </Stack>
        <Group justify="flex-end" mt="lg">
          <Button
            variant="default"
            disabled={deleting}
            onClick={() => setBulkDelete(null)}
          >
            إلغاء
          </Button>
          <Button
            color="red"
            loading={deleting}
            onClick={() => void removeSelected()}
          >
            حذف نهائي
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}

/** A card's checkbox. Its clicks must not reach the card, which opens on click. */
function SelectBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Checkbox
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
    </div>
  );
}

/** «تحديد الكل» + the red delete button, above a selectable grid. */
function SelectionBar({
  total,
  selected,
  onToggleAll,
  onDelete,
}: {
  total: number;
  selected: number;
  onToggleAll: (on: boolean) => void;
  onDelete: () => void;
}) {
  const all = total > 0 && selected === total;
  return (
    <Group justify="space-between">
      <Checkbox
        label="تحديد الكل"
        checked={all}
        indeterminate={selected > 0 && !all}
        onChange={(e) => onToggleAll(e.currentTarget.checked)}
      />
      <Button
        size="xs"
        color="red"
        variant={selected > 0 ? "filled" : "default"}
        leftSection={<IconTrash size={14} />}
        disabled={selected === 0}
        onClick={onDelete}
      >
        {selected > 0 ? `حذف (${selected})` : "حذف"}
      </Button>
    </Group>
  );
}
