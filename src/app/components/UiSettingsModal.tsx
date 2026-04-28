/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import React, { useState, useEffect } from 'react';
import { X, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import localforage from 'localforage';
import { 
  type UiSettings, 
  defaultSettings, 
  UI_SETTINGS_KEY, 
  applyUiSettings, 
  loadUiSettings 
} from '../lib/ui-settings';

export function UiSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<UiSettings>(defaultSettings);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await localforage.getItem<UiSettings>(UI_SETTINGS_KEY);
        if (saved) {
          setSettings({ ...defaultSettings, ...saved });
        } else {
          // Fallback to localStorage
          const legacySaved = localStorage.getItem(UI_SETTINGS_KEY);
          if (legacySaved) {
            try {
              const parsed = JSON.parse(legacySaved);
              setSettings({ ...defaultSettings, ...parsed });
              await localforage.setItem(UI_SETTINGS_KEY, parsed);
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error('Failed to load UI settings', e);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      applyUiSettings(settings);
    }
  }, [settings, isOpen]);

  const saveSettings = async () => {
    try {
      await localforage.setItem(UI_SETTINGS_KEY, settings);
      const { bgImage, ...smallSettings } = settings;
      localStorage.setItem(
        UI_SETTINGS_KEY + '_small',
        JSON.stringify(smallSettings)
      );
      toast.dismiss();
      toast.success('Đã lưu cài đặt!');
    } catch (e) {
      console.error('Failed to save UI settings', e);
      toast.dismiss();
      toast.error('Không thể lưu cài đặt.');
      return;
    }

    onClose();
  };

  const resetSettings = async () => {
    toast.info('Đang reset cài đặt...');
    setSettings(defaultSettings);
    await localforage.removeItem(UI_SETTINGS_KEY);
    localStorage.removeItem(UI_SETTINGS_KEY);
    localStorage.removeItem(UI_SETTINGS_KEY + '_small');
    toast.success('Đã reset cài đặt!');
    onClose();
    const root = document.documentElement;
    root.style.removeProperty('--background');
    root.style.removeProperty('--bg-image');
    root.style.removeProperty('--bg-image-size');
    root.style.removeProperty('--bg-image-repeat');
    root.style.removeProperty('--bg-image-position');
    root.style.removeProperty('--bg-image-attachment');
    root.style.removeProperty('--bg-image-opacity');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--foreground');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--border');
    root.style.removeProperty('--shadow-hard');
    root.style.removeProperty('--shadow-hard-sm');
    root.style.removeProperty('--font-main');
    root.style.removeProperty('--font-display');
    root.style.removeProperty('--font-size');
    root.style.removeProperty('--table-padding');
    root.style.removeProperty('--radius');
    root.style.removeProperty('--font-table');
    root.style.removeProperty('--title-align');
    root.style.removeProperty('--text-align');
    root.style.removeProperty('--stripe-color1');
    root.style.removeProperty('--stripe-color2');
    document.body.classList.remove('sidebar-right');
    onClose();
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, bgImage: reader.result as string });
      };
      reader.onerror = () => {
        toast.error('Có lỗi khi đọc file ảnh.');
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-white/90 backdrop-blur-md shadow-[-4px_0px_0px_rgba(0,0,0,1)] z-[10000] flex flex-col animate-in slide-in-from-right-full duration-300">
      <div className="p-4 flex justify-between items-center bg-background">
        <h3 className="font-black text-lg uppercase flex items-center gap-2 text-primary">
          <Settings2 className="w-5 h-5" /> Cài đặt Giao diện
        </h3>
        <button
          onClick={onClose}
          aria-label="Đóng cài đặt giao diện"
          className="p-1 hover:bg-primary/10 rounded-lg border-2 border-transparent hover:border-primary transition-all text-primary"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6 bg-white/50 text-primary hide-scrollbar">
        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">
            1. MÀU SẮC & NỀN (COLORS & BG)
          </h4>
          <div className="flex flex-col gap-2">
            <label className="font-bold text-[0.8125rem]">
              Ảnh nền (Background Image)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer bg-white border-2 border-primary rounded-lg p-2 text-center text-xs font-bold shadow-hard-sm hover:bg-primary/5 transition-all">
                {settings.bgImage ? 'Đổi ảnh nền' : 'Tải ảnh lên'}
                <input
                  type="file"
                  id="bg-image-upload"
                  name="bg-image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e)}
                />
              </label>
              {settings.bgImage && (
                <button
                  onClick={() => setSettings({ ...settings, bgImage: '' })}
                  aria-label="Xóa ảnh nền"
                  className="p-2 border-2 border-destructive text-destructive rounded-lg shadow-hard-sm hover:bg-destructive/10 transition-all"
                  title="Xóa ảnh nền"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {(settings.bgImage || settings.bgImageStyle?.startsWith('brand-stripes-')) && (
              <>
                <div
                  className="h-24 w-full rounded-lg mt-1 border border-primary/20"
                  style={{
                    backgroundImage: 
                      settings.bgImageStyle === 'brand-stripes-purple' ? 'var(--pattern-stripes-purple)' :
                      settings.bgImageStyle === 'brand-stripes-green' ? 'var(--pattern-stripes-green)' :
                      settings.bgImageStyle === 'brand-stripes-brown' ? 'var(--pattern-stripes-brown)' :
                      `url(${settings.bgImage})`,
                    backgroundSize:
                      settings.bgImageStyle === 'pattern-sm'
                        ? '30px'
                        : settings.bgImageStyle === 'pattern-md'
                          ? '60px'
                          : settings.bgImageStyle === 'pattern-lg'
                            ? '120px'
                            : settings.bgImageStyle?.startsWith('brand-stripes-')
                              ? '20px 20px'
                              : 'cover',
                    backgroundRepeat: settings.bgImageStyle?.startsWith('pattern') || settings.bgImageStyle?.startsWith('brand-stripes')
                      ? 'repeat'
                      : 'no-repeat',
                    backgroundPosition: settings.bgImageStyle?.startsWith('pattern') 
                      ? 'top left'
                      : 'center',
                    opacity: (settings.bgImageOpacity ?? 100) / 100,
                  }}
                />
                <div className="flex flex-col gap-1 mt-1">
                  <label htmlFor="bg-image-style" className="font-bold text-[0.8125rem]">
                    Kiểu hiển thị ảnh
                  </label>
                  <select
                    id="bg-image-style"
                    value={settings.bgImageStyle || 'cover'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bgImageStyle: e.target.value as any,
                      })
                    }
                    className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white"
                  >
                    <option value="cover">Lấp đầy màn hình (Cover)</option>
                    <option value="contain">Vừa vặn màn hình (Contain)</option>
                    <option value="original">Kích thước gốc (Original)</option>
                    <option value="pattern-sm">Nhân bản (Nhỏ)</option>
                    <option value="pattern-md">Nhân bản (Vừa)</option>
                    <option value="pattern-lg">Nhân bản (Lớn)</option>
                    <option value="brand-stripes-purple">Brand: Sọc Tím</option>
                    <option value="brand-stripes-green">Brand: Sọc Xanh</option>
                    <option value="brand-stripes-brown">Brand: Sọc Nâu</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-[0.8125rem]">
                      Độ đậm nhạt của ảnh
                    </label>
                    <span className="text-xs font-bold">
                      {settings.bgImageOpacity ?? 100}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.bgImageOpacity ?? 100}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bgImageOpacity: Number(e.target.value),
                      })
                    }
                    className="w-full accent-primary"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="accent-color" className="font-bold text-[0.8125rem]">
              Màu nhấn (Accent/Table)
            </label>
            <input
              id="accent-color"
              type="color"
              value={settings.accent?.startsWith('#') && settings.accent.length === 7 ? settings.accent : '#C88493'}
              onChange={(e) =>
                setSettings({ ...settings, accent: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="text-color" className="font-bold text-[0.8125rem]">
              Màu chữ (Text)
            </label>
            <input
              id="text-color"
              type="color"
              value={settings.text?.startsWith('#') && settings.text.length === 7 ? settings.text : '#5D111A'}
              onChange={(e) =>
                setSettings({ ...settings, text: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="stripe-color1" className="font-bold text-[0.8125rem]">
              Nền Web: Màu sọc 1
            </label>
            <input
              id="stripe-color1"
              type="color"
              value={settings.stripeColor1?.startsWith('#') && settings.stripeColor1.length === 7 ? settings.stripeColor1 : '#F6F4F0'}
              onChange={(e) =>
                setSettings({ ...settings, stripeColor1: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="stripe-color2" className="font-bold text-[0.8125rem]">
              Nền Web: Màu sọc 2
            </label>
            <input
              id="stripe-color2"
              type="color"
              value={settings.stripeColor2?.startsWith('#') && settings.stripeColor2.length === 7 ? settings.stripeColor2 : '#F4ECD8'}
              onChange={(e) =>
                setSettings({ ...settings, stripeColor2: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="border-color" className="font-bold text-[0.8125rem]">
              Viền & Đổ bóng (Border)
            </label>
            <input
              id="border-color"
              type="color"
              value={settings.border?.startsWith('#') && settings.border.length === 7 ? settings.border : '#E7DBDC'}
              onChange={(e) =>
                setSettings({ ...settings, border: e.target.value })
              }
              className="w-10 h-10 cursor-pointer border-2 border-primary rounded-lg p-0.5 shadow-hard-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">
            2. FONT CHỮ & HIỂN THỊ
          </h4>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[0.8125rem]">
              Font chữ Bảng (Table Font)
            </label>
            <select
              value={settings.tableFont || "var(--font-main)"}
              onChange={(e) =>
                setSettings({ ...settings, tableFont: e.target.value })
              }
              className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white"
            >
              <option value="var(--font-main)">Font chữ hệ thống (Mặc định)</option>
              <option value="var(--font-nunito)">Nunito (Mềm mại)</option>
              <option value="var(--font-quicksand)">Quicksand (Tròn trịa)</option>
              <option value="var(--font-inter)">Inter (Chuyên nghiệp)</option>
              <option value="var(--font-roboto)">Roboto (Cổ điển)</option>
              <option value="var(--font-montserrat)">Montserrat (Đậm nét)</option>
              <option value="var(--font-space)">Space Grotesk (Hiện đại)</option>
              <option value="var(--font-playfair)">Playfair Display (Thanh lịch)</option>
              <option value="var(--font-mono)">JetBrains Mono (Kỹ thuật)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="font-size" className="font-bold text-[0.8125rem]">
              Cỡ chữ cho bảng (Table Font Size)
            </label>
            <div className="flex items-center gap-3">
              <input 
                type="range"
                min="10"
                max="24"
                step="1"
                value={parseInt(settings.fontSize)}
                onChange={(e) => setSettings({ ...settings, fontSize: `${e.target.value}px` })}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-black w-10 text-center">{settings.fontSize}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="table-padding" className="font-bold text-[0.8125rem]">
              Mật độ Bảng (Table Padding)
            </label>
            <select
              id="table-padding"
              value={settings.tablePadding}
              onChange={(e) =>
                setSettings({ ...settings, tablePadding: e.target.value })
              }
              className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white"
            >
              <option value="8px 10px">Thu gọn (Compact)</option>
              <option value="12px 16px">Tiêu chuẩn (Normal)</option>
              <option value="16px 24px">Thoải mái (Relaxed)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">
            3. BỐ CỤC (LAYOUT)
          </h4>
          <div className="flex flex-col gap-1" style={{ marginBottom: '12px' }}>
            <label htmlFor="sidebar-pos" className="font-bold" style={{ fontSize: '11.6px', marginTop: '0px', marginRight: '0px', marginLeft: '4px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '12px' }}>
              Vị trí Sidebar Menu
            </label>
            <select
              id="sidebar-pos"
              value={settings.sidebarPos}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sidebarPos: e.target.value as 'left' | 'right',
                })
              }
              className="w-full border-2 border-primary rounded-lg p-2 font-bold outline-none focus:shadow-hard-sm transition-all bg-white"
              style={{ fontSize: '14px', lineHeight: '16px' }}
            >
              <option value="left">Trái (Left)</option>
              <option value="right">Phải (Right)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="border-radius" className="font-bold" style={{ fontSize: '11.6px', marginRight: '0px', marginTop: '0px', marginLeft: '0px', marginBottom: '0px', paddingLeft: '12px', paddingTop: '12px', paddingRight: '12px', paddingBottom: '12px' }}>
              Độ bo góc (Border Radius)
            </label>
            <select
              id="border-radius"
              value={settings.radius}
              onChange={(e) =>
                setSettings({ ...settings, radius: e.target.value })
              }
              className="w-full border-2 border-primary rounded-lg p-2 outline-none focus:shadow-hard-sm transition-all bg-white"
              style={{ fontSize: '14px', lineHeight: '18px', paddingRight: '12px', marginLeft: '0px', marginRight: '0px', marginTop: '12px', marginBottom: '0px', fontWeight: 'normal' }}
            >
              <option value="8px">Bo tròn ít (Rounded - 8px)</option>
              <option value="16px">Bo tròn nhiều (Rounded - 16px)</option>
              <option value="999px">Hình viên thuốc (Pill)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="title-align" className="font-bold text-[0.8125rem]">
              Căn lề Tiêu đề (Header Title)
            </label>
            <select
              id="title-align"
              value={settings.titleAlign}
              onChange={(e) =>
                setSettings({ ...settings, titleAlign: e.target.value })
              }
              className="w-full border-2 border-primary rounded-lg p-2 font-bold text-sm outline-none focus:shadow-hard-sm transition-all bg-white"
            >
              <option value="flex-start|left">Căn Trái</option>
              <option value="center|center">Căn Giữa</option>
              <option value="flex-end|right">Căn Phải</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-black text-xs text-primary/50 tracking-widest uppercase border-b-2 border-primary/10 pb-1">
            4. CHỨC NĂNG HỆ THỐNG (SYSTEM)
          </h4>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="auto-save" className="font-bold text-[0.8125rem]">
                Tự động lưu (Auto-save)
              </label>
              <input
                id="auto-save"
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) =>
                  setSettings({ ...settings, autoSave: e.target.checked })
                }
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="show-help" className="font-bold text-[0.8125rem]">
                Hiển thị Trợ giúp (Show Help)
              </label>
              <input
                id="show-help"
                type="checkbox"
                checked={settings.showHelp}
                onChange={(e) =>
                  setSettings({ ...settings, showHelp: e.target.checked })
                }
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex gap-3 bg-background">
        <button
          onClick={saveSettings}
          className="flex-1 text-primary-foreground py-2.5 rounded-xl font-bold border-2 border-primary shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all bg-primary"
        >
          Lưu Lại
        </button>
        <button
          onClick={resetSettings}
          className="flex-1 bg-white text-primary py-2.5 rounded-xl font-bold border-2 border-primary hover:bg-primary/5 shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          Mặc định
        </button>
      </div>
    </div>
  );
}
