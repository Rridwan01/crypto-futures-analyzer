import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { X, Save, Sliders, Volume2, Bell } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  const { settings, updateSettings } = useTradingStore();
  const [form, setForm] = useState({ ...settings });

  if (!isOpen) return null;

  const handleWeightChange = (key, val) => {
    const num = parseInt(val) || 0;
    setForm(prev => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: num
      }
    }));
  };

  const handleFieldChange = (key, val) => {
    const num = parseFloat(val) || 0;
    setForm(prev => ({
      ...prev,
      [key]: num
    }));
  };

  const handleToggleChange = (key) => {
    setForm(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    updateSettings(form);
    onClose();
  };

  const handleRequestNotifications = async () => {
    if (typeof Notification === 'undefined') {
      alert('Desktop notifications are not supported in this browser.');
      return;
    }
    if (Notification.permission !== 'granted') {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        setForm(prev => ({ ...prev, desktopNotifications: true }));
      }
    } else {
      handleToggleChange('desktopNotifications');
    }
  };

  // Calculate sum of weights to show if it equals 100
  const weightsTotal = Object.values(form.weights).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 select-none">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-blue-500" />
            <span className="text-sm font-bold text-slate-100">Indicator & Weights Settings</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-6 text-xs text-slate-300">
          
          {/* Section 1: Indicators Parameter Lengths */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">
              Timeframe Length Parameters (Periods)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">RSI Period</label>
                <input
                  type="number"
                  value={form.rsiPeriod}
                  onChange={(e) => handleFieldChange('rsiPeriod', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg w-full font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">EMA Short</label>
                <input
                  type="number"
                  value={form.emaShort}
                  onChange={(e) => handleFieldChange('emaShort', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg w-full font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">EMA Medium</label>
                <input
                  type="number"
                  value={form.emaMedium}
                  onChange={(e) => handleFieldChange('emaMedium', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg w-full font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">EMA Long</label>
                <input
                  type="number"
                  value={form.emaLong}
                  onChange={(e) => handleFieldChange('emaLong', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg w-full font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">SMA Baseline</label>
                <input
                  type="number"
                  value={form.smaBaseline}
                  onChange={(e) => handleFieldChange('smaBaseline', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg w-full font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">BB Period</label>
                <input
                  type="number"
                  value={form.bbPeriod}
                  onChange={(e) => handleFieldChange('bbPeriod', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg w-full font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">BB Std Dev</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.bbStdDev}
                  onChange={(e) => handleFieldChange('bbStdDev', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg w-full font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">ATR Period</label>
                <input
                  type="number"
                  value={form.atrPeriod}
                  onChange={(e) => handleFieldChange('atrPeriod', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg w-full font-mono text-center focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Composite Signal Category Weights */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Composite Weights Configuration (Sum: {weightsTotal})
              </h4>
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                weightsTotal === 100 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {weightsTotal === 100 ? 'Balanced' : 'Relative'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.keys(form.weights).map((key) => (
                <div key={key}>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-1 capitalize">
                    {key === 'ma' ? 'MA Alignment' : key === 'sentiment' ? 'Fear & Greed' : key}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={form.weights[key]}
                      onChange={(e) => handleWeightChange(key, e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg w-full font-mono text-center pr-5 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-2 text-[9px] font-bold text-slate-600">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Notification Alerts preferences */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">
              Alert Notifications Preferences
            </h4>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <label className="flex items-center gap-3 cursor-pointer group flex-1">
                <input
                  type="checkbox"
                  checked={form.soundEnabled}
                  onChange={() => handleToggleChange('soundEnabled')}
                  className="sr-only"
                />
                <div className={`w-8 h-4 rounded-full transition-colors flex items-center ${
                  form.soundEnabled ? 'bg-blue-600' : 'bg-slate-800'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    form.soundEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Volume2 size={14} className={form.soundEnabled ? 'text-blue-400' : 'text-slate-500'} />
                  <div>
                    <div className="font-semibold text-slate-200 group-hover:text-white transition-colors">Acoustic Audio Beeps</div>
                    <div className="text-[9px] text-slate-500">Produce synthetic sound cues on strong signal triggers</div>
                  </div>
                </div>
              </label>

              <div className="flex items-center gap-3 cursor-pointer group flex-1" onClick={handleRequestNotifications}>
                <div className={`w-8 h-4 rounded-full transition-colors flex items-center ${
                  form.desktopNotifications ? 'bg-blue-600' : 'bg-slate-800'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    form.desktopNotifications ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Bell size={14} className={form.desktopNotifications ? 'text-blue-400' : 'text-slate-500'} />
                  <div>
                    <div className="font-semibold text-slate-200 group-hover:text-white transition-colors">Browser Push Notifications</div>
                    <div className="text-[9px] text-slate-500">Provide OS-level system banners for real-time tracking</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/20 select-none">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-800 hover:bg-slate-850 hover:text-white rounded-lg text-slate-400 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-md shadow-blue-900/20 transition-colors"
          >
            <Save size={14} />
            Save changes
          </button>
        </div>

      </div>
    </div>
  );
}
