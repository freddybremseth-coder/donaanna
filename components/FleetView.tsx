
import React, { useState, useEffect } from 'react';
import { Truck, Plus, X, Gauge, LayoutGrid, List } from 'lucide-react';
import { useTranslation } from '../services/i18nService';
import { Language } from '../types';

interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'ACTIVE' | 'SERVICE' | 'BROKEN';
  lastService: string;
  condition: string;
  trackingUnit: string;
  currentValue: number;
}

interface FleetViewProps {
  language: Language;
}

const FleetView: React.FC<FleetViewProps> = ({ language }) => {
  const { t } = useTranslation(language);
  const [fleet, setFleet] = useState<Equipment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [newItem, setNewItem] = useState<Partial<Equipment>>({
    status: 'ACTIVE', type: t('tractor'), lastService: new Date().toISOString().split('T')[0],
    condition: t('good'), trackingUnit: t('hours'), currentValue: 0
  });

  useEffect(() => {
    // ... (logic to load from localStorage)
  }, []);

  const handleAddItem = () => {
    // ... (logic to add item)
  };

  const getStatusText = (status: Equipment['status']) => {
    switch(status) {
      case 'ACTIVE': return t('active');
      case 'SERVICE': return t('service');
      case 'BROKEN': return t('broken');
      default: return status;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{t('fleet_and_equipment')}</h2>
          <p className="text-slate-400 text-sm italic">{t('manage_fleet_and_monitor_metrics')}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* View mode buttons */}
          <button onClick={() => setIsModalOpen(true)} className="...">
            <Plus size={20} /> {t('register_equipment')}
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {fleet.map((item) => (
            <div key={item.id} className="glass rounded-3xl p-6 ...">
              <span className={`...`}>{getStatusText(item.status)}</span>
              <h3 className="...">{item.name}</h3>
              <p className="...">{t('accumulated_operational_data')}</p>
              <div className="flex justify-between text-xs">
                <span>{t('condition')}:</span>
                <span>{item.condition}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>{t('last_service')}:</span>
                <span>{item.lastService}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass ...">
          <table className="w-full ...">
            <thead>
              <tr>
                <th className="px-6 py-4">{t('machine_model')}</th>
                <th className="px-6 py-4">{t('type')}</th>
                <th className="px-6 py-4">{t('status')}</th>
                <th className="px-6 py-4">{t('measurement_unit')}</th>
                <th className="px-6 py-4 text-right">{t('operating_value')}</th>
                <th className="px-6 py-4">{t('condition')}</th>
                <th className="px-6 py-4">{t('last_service')}</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                   <td className="px-6 py-4"><span className={`...`}>{getStatusText(item.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] ...">
          <div className="glass ...">
            <h3 className="text-xl ...">{t('register_new_equipment')}</h3>
            <label>{t('model_name')}</label>
            <label>{t('type')}</label>
            <select value={newItem.type} onChange={e => {/*...*/}}>
              <option value="Traktor">{t('tractor')}</option>
              <option value="Innhøster">{t('harvester')}</option>
              {/* ... other options ... */}
            </select>
            <label>{t('measurement_unit')}</label>
            <label>{t('status')}</label>
            <select value={newItem.status} onChange={e => {/*...*/}}>
              <option value="ACTIVE">{t('active')}</option>
              <option value="SERVICE">{t('service')}</option>
              <option value="BROKEN">{t('broken')}</option>
            </select>
            <label>{t('start_value')} ({newItem.trackingUnit})</label>
            <button onClick={handleAddItem} className="...">{t('register_in_fleet')} <Truck size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetView;
