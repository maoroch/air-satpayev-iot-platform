"use client";

import React, { useState } from "react";
import { X, PlusCircle, Cpu, Tag, Clock, Wifi, AlertCircle, Check } from "lucide-react";

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  apiBase: string;
  onDeviceAdded: (newDeviceId: string) => void;
}

export default function AddDeviceModal({
  isOpen,
  onClose,
  token,
  apiBase,
  onDeviceAdded
}: AddDeviceModalProps) {
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [model, setModel] = useState("Satpayev Air Purifier v1");
  const [macAddress, setMacAddress] = useState("");
  const [filterHoursMax, setFilterHoursMax] = useState("720");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = deviceId.trim().toLowerCase().replace(/\s+/g, "-");
    const cleanName = name.trim();

    if (!cleanId) {
      setErrorMsg("Укажите идентификатор устройства (например, purifier-satpayev-02)");
      return;
    }
    if (!cleanName) {
      setErrorMsg("Укажите понятное название прибора");
      return;
    }

    const hours = parseFloat(filterHoursMax) || 720;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: cleanId,
          name: cleanName,
          model: model.trim() || "Satpayev Air Purifier v1",
          mac_address: macAddress.trim() || null,
          filter_hours_max: hours
        })
      });

      if (res.ok) {
        onDeviceAdded(cleanId);
        onClose();
        setDeviceId("");
        setName("");
        setMacAddress("");
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.detail || "Не удалось зарегистрировать устройство. Проверьте права доступа.");
      }
    } catch {
      setErrorMsg("Ошибка сетевого соединения с сервером API");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-black/5 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <PlusCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 tracking-tight">
                Регистрация прибора
              </h3>
              <p className="text-xs text-gray-500">
                Добавление нового очистителя воздуха в платформу (FR-03, FR-18)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 mb-4 font-medium">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Device ID */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Cpu size={14} className="text-blue-600" />
              <span>Идентификатор устройства (ID)*</span>
            </label>
            <input
              type="text"
              placeholder="purifier-satpayev-02"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-400"
              required
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Используется в MQTT-топике: devices/[ID]/telemetry
            </span>
          </div>

          {/* Name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Tag size={14} className="text-blue-600" />
              <span>Название прибора*</span>
            </label>
            <input
              type="text"
              placeholder="Очиститель в лаб. 304"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-400"
              required
            />
          </div>

          {/* Model & MAC */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Модель
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1.5">
                <Wifi size={13} className="text-blue-600" />
                <span>MAC-адрес</span>
              </label>
              <input
                type="text"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Filter Hours Max */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Clock size={14} className="text-blue-600" />
              <span>Ресурс фильтра (норматив в часах)</span>
            </label>
            <input
              type="number"
              min="50"
              max="10000"
              value={filterHoursMax}
              onChange={(e) => setFilterHoursMax(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end items-center gap-2.5 mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <Check size={16} />
              <span>{isSubmitting ? "Регистрация..." : "Зарегистрировать"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
