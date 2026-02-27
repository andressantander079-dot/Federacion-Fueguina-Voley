'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, Image, DollarSign, MapPin, Users, Info, Save, Upload, Trash2, Plus, GripVertical, X, ExternalLink } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function AdminConfigPage() {
   const { settings: initialSettings, loading: loadingSettings } = useSettings();
   const [activeTab, setActiveTab] = useState('general');
   const [settings, setSettings] = useState<any>(null);
   const [saving, setSaving] = useState(false);

   // Fallback for null settings to prevent infinite loading
   const [errorLoading, setErrorLoading] = useState(false);

   // --- SPONSORS STATE ---
   const [sponsors, setSponsors] = useState<any[]>([]);
   const [isEditingSponsor, setIsEditingSponsor] = useState(false);
   const [sponsorForm, setSponsorForm] = useState({
      id: '',
      name: '',
      website: '',
      logo_url: '',
      active: true,
      display_order: 99
   });
   const [sponsorLogoFile, setSponsorLogoFile] = useState<File | null>(null);

   const [venues, setVenues] = useState<any[]>([]);
   const [tramites, setTramites] = useState<any[]>([{ title: '', price: '' }]);
   const [categories, setCategories] = useState<any[]>([]);
   const [newCategory, setNewCategory] = useState<{ name: string, min_year?: string, max_year?: string }>({ name: '' });


   // Uploads
   const [logoFile, setLogoFile] = useState<File | null>(null);
   const [uploadingLogo, setUploadingLogo] = useState(false);

   const supabase = createClient();

   useEffect(() => {
      if (initialSettings) {
         setSettings(initialSettings);
         let loadedFees = initialSettings.procedure_fees ? [...initialSettings.procedure_fees] : [];

         // Ensure system fees exist
         const requiredFees = ['Inscripcion de clubes', 'Inscripcion de Jugadoras/es', 'Pase a prestamo', 'Pase'];
         requiredFees.forEach(rf => {
            const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const exists = loadedFees.find((lf: any) => norm(lf.title) === norm(rf));
            if (!exists) loadedFees.push({ title: rf, price: '0' });
         });

         setTramites(loadedFees);
      } else if (!loadingSettings && !initialSettings) {
         // No settings found in DB
         setSettings({
            id: undefined,
            registration_open: true,
         });
         setTramites([
            { title: 'Inscripcion de clubes', price: '0' },
            { title: 'Inscripcion de Jugadoras/es', price: '0' },
            { title: 'Pase a prestamo', price: '0' },
            { title: 'Pase', price: '0' }
         ]);
      }
      if (!loadingSettings) fetchSubData();
   }, [initialSettings, loadingSettings]);


   async function fetchSubData() {
      const { data: s } = await supabase.from('sponsors').select('*').order('display_order');
      if (s) setSponsors(s);

      const { data: v } = await supabase.from('venues').select('*').order('name');
      if (v) setVenues(v);

      const { data: c } = await supabase.from('categories').select('*').order('name');
      if (c) setCategories(c);
   }

   async function handleSaveGeneral() {
      setSaving(true);
      try {
         let logoUrl = settings.logo_url;

         // 1. Upload Logo if changed
         if (logoFile) {
            setUploadingLogo(true);
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('config-assets').upload(fileName, logoFile);
            if (uploadError) throw uploadError;

            const { data: publicUrl } = supabase.storage.from('config-assets').getPublicUrl(fileName);
            logoUrl = publicUrl.publicUrl;
            setUploadingLogo(false);
         }

         // 2. Update Settings - STRICT WHITELIST
         // We explicitly construct the payload to ensure NO invalid/protected columns are sent.
         const payload = {
            // Toggles & Text
            registration_open: settings.registration_open,
            registration_message: settings.registration_message,
            warning_banner_active: settings.warning_banner_active,
            warning_banner_text: settings.warning_banner_text,

            // Contact
            contact_phone: settings.contact_phone,
            contact_email: settings.contact_email,
            contact_address: settings.contact_address,
            contact_instagram: settings.contact_instagram,
            logo_url: logoUrl,

            // Bank Details (New Columns)
            bank_name: settings.bank_name,
            bank_holder: settings.bank_holder,
            bank_cbu: settings.bank_cbu,
            bank_alias: settings.bank_alias,
            bank_cuit: settings.bank_cuit,

            // Fees
            procedure_fees: tramites,

            updated_at: new Date().toISOString()
         };

         console.log("Saving Settings Payload:", payload);

         const { error, data } = await supabase.from('settings').update(payload)
            .eq('singleton_key', true)
            .select();

         if (error) {
            console.error("Supabase Update Error:", error);
            throw error;
         }

         // Validation: Ensure row was actually updated
         if (!data || data.length === 0) {
            console.error("Update returned 0 rows. RLS or Match Failure.");
            throw new Error("No se pudo confirmar el guardado (Fila no encontrada o Permisos insuficientes).");
         }

         alert('✅ Configuraciones guardadas correctamente (Persistido).');
      } catch (e: any) {
         console.error(e);
         alert('Error guardando: ' + e.message);
      } finally {
         setSaving(false);
      }
   }

   // --- SPONSORS LOGIC (PREMIUM) ---
   const resetSponsorForm = () => {
      setSponsorForm({ id: '', name: '', website: '', logo_url: '', active: true, display_order: 99 });
      setSponsorLogoFile(null);
      setIsEditingSponsor(false);
   }

   const handleEditSponsor = (sponsor: any) => {
      setSponsorForm(sponsor);
      setIsEditingSponsor(true);
   }

   const handleDeleteSponsor = async (id: string) => {
      if (!confirm('¿Seguro que deseas eliminar este sponsor?')) return;
      await supabase.from('sponsors').delete().eq('id', id);
      fetchSubData();
   }

   const handleSaveSponsor = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         let logoUrl = sponsorForm.logo_url;

         // Upload Logo if changed
         if (sponsorLogoFile) {
            const fileExt = sponsorLogoFile.name.split('.').pop();
            const fileName = `sponsors/${Math.random()}.${fileExt}`;

            // FIX: Use 'config-assets' instead of 'documents'
            const { error: uploadError } = await supabase.storage.from('config-assets').upload(fileName, sponsorLogoFile);
            if (uploadError) throw uploadError;

            const { data: publicUrl } = supabase.storage.from('config-assets').getPublicUrl(fileName);
            // Public URL object structure depends on SDK version, usually data: { publicUrl }
            logoUrl = publicUrl.publicUrl;
         }

         const payload = {
            name: sponsorForm.name,
            website: sponsorForm.website,
            logo_url: logoUrl,
            active: sponsorForm.active,
            display_order: sponsorForm.display_order
         };

         if (sponsorForm.id) {
            await supabase.from('sponsors').update(payload).eq('id', sponsorForm.id);
         } else {
            await supabase.from('sponsors').insert([payload]);
         }

         resetSponsorForm();
         fetchSubData();
      } catch (error: any) {
         console.error('Error saving sponsor:', error);
         alert('Error al guardar sponsor: ' + (error.message || error));
      }
   };

   const handleToggleSponsorActive = async (sponsor: any) => {
      try {
         const newActive = !sponsor.active;
         setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, active: newActive } : s));
         await supabase.from('sponsors').update({ active: newActive }).eq('id', sponsor.id);
      } catch (err) {
         console.error("Error toggling sponsor:", err);
         fetchSubData(); // reload on error
      }
   };

   // --- VENUES LOGIC ---
   async function handleAddVenue(e: React.FormEvent) {
      e.preventDefault();
      try {
         const form = e.target as HTMLFormElement;
         const name = (form.elements.namedItem('name') as HTMLInputElement).value;
         const address = (form.elements.namedItem('address') as HTMLInputElement).value;
         const mapUrl = (form.elements.namedItem('mapUrl') as HTMLInputElement).value;
         if (!name) return;

         const { error } = await supabase.from('venues').insert([{ name, address, google_maps_url: mapUrl }]);
         if (error) throw error;

         form.reset();
         fetchSubData();
         alert("✅ Sede agregada correctamente");
      } catch (error: any) {
         console.error("Error adding venue:", error);
         alert("Error al agregar sede: " + error.message);
      }
   }

   // --- CATEGORIES LOGIC ---
   async function addCategory(e: React.FormEvent) {
      e.preventDefault();
      if (!newCategory.name) return;

      const payload: any = { name: newCategory.name };
      if (newCategory.min_year) payload.min_year = parseInt(newCategory.min_year);
      if (newCategory.max_year) payload.max_year = parseInt(newCategory.max_year);

      const { error } = await supabase.from('categories').insert([payload]);
      if (!error) {
         setNewCategory({ name: '', min_year: '', max_year: '' });
         fetchSubData();
      }
   }

   async function deleteCategory(id: string) {
      if (confirm('¿Eliminar categoría? Esto podría afectar torneos existentes.')) {
         await supabase.from('categories').delete().eq('id', id);
         fetchSubData();
      }
   }


   if (loadingSettings) return <div className="p-10 text-center text-gray-400 font-bold animate-pulse">Cargando configuración...</div>;

   if (!settings) return (
      <div className="p-10 text-center">
         <h3 className="text-xl font-bold text-red-500 mb-2">Error de Carga</h3>
         <p className="text-gray-500 mb-4">No se pudo inicializar la configuración.</p>
         <button onClick={() => window.location.reload()} className="px-4 py-2 bg-tdf-blue text-white rounded-lg font-bold">Reintentar</button>
      </div>
   );

   return (
      <div className="space-y-6 text-white min-h-screen">
         <div className="flex items-center gap-3 mb-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm">
            <div className="p-3 bg-tdf-blue rounded-xl text-white shadow-lg shadow-blue-900/20">
               <Settings size={28} />
            </div>
            <div>
               <h1 className="text-3xl font-black text-white">Configuración</h1>
               <p className="text-zinc-400 font-medium">Administra aspectos generales de la plataforma.</p>
            </div>
         </div>

         {/* TABS */}
         <div className="flex gap-2 overflow-x-auto pb-2 border-b border-zinc-800">
            {[
               { id: 'general', label: 'General y Contacto', icon: Info },
               { id: 'sponsors', label: 'Sponsors', icon: Image },
               { id: 'sedes', label: 'Sedes / Mapas', icon: MapPin },
               { id: 'tramites', label: 'Tasas y Aranceles', icon: DollarSign },
               { id: 'categorias', label: 'Categorías', icon: Users },
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 whitespace-nowrap transition ${activeTab === tab.id ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'} `}
               >
                  <tab.icon size={16} /> {tab.label}
               </button>
            ))}
         </div>

         {/* CONTENT */}
         <div className="flex flex-col gap-6">

            {/* === GENERAL === */}
            {activeTab === 'general' && (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
                  {/* 1. Inscripciones y Alertas */}
                  <div className="bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800 space-y-6">
                     <h3 className="text-lg font-black text-white flex items-center gap-2"><Info size={20} className="text-tdf-orange" /> Control de Accesos</h3>

                     <div className={`p-4 rounded-xl border-l-4 transition ${settings.registration_open ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                        <div className="flex justify-between items-center mb-2">
                           <span className="font-bold text-white">Lista de Buena Fe (Jugadores)</span>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={settings.registration_open} onChange={e => setSettings({ ...settings, registration_open: e.target.checked })} className="sr-only peer" />
                              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                           </label>
                        </div>
                        <p className="text-xs text-zinc-400 font-medium mb-2">{settings.registration_open ? 'Clubes pueden agregar/editar jugadores.' : 'Inscripciones cerradas. Clubes no pueden modificar listas.'}</p>
                        {!settings.registration_open && (
                           <input
                              className="w-full text-xs font-bold bg-zinc-950 border border-zinc-800 p-2 rounded text-red-500 placeholder-red-500/50"
                              placeholder="Mensaje de cierre..."
                              value={settings.registration_message || ''}
                              onChange={e => setSettings({ ...settings, registration_message: e.target.value })}
                           />
                        )}
                     </div>

                     <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                        <div className="flex justify-between items-center mb-2">
                           <span className="font-bold text-white">Banner de Alerta Global</span>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={settings.warning_banner_active} onChange={e => setSettings({ ...settings, warning_banner_active: e.target.checked })} className="sr-only peer" />
                              <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 peer-checked:bg-yellow-500"></div>
                           </label>
                        </div>
                        <textarea
                           className="w-full text-sm font-medium bg-zinc-950 border border-zinc-800 p-3 rounded-lg outline-none focus:border-yellow-500 text-white"
                           placeholder="Mensaje de alerta para clubes (ej: Mantenimiento programado)..."
                           value={settings.warning_banner_text || ''}
                           onChange={e => setSettings({ ...settings, warning_banner_text: e.target.value })}
                           rows={3}
                        />
                     </div>
                  </div>

                  {/* 2. Identidad y Contacto */}
                  <div className="bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800 space-y-6">
                     <h3 className="text-lg font-black text-white flex items-center gap-2"><Image size={20} className="text-tdf-blue" /> Identidad y Contacto</h3>

                     <div className="space-y-4">
                        <div>
                           <label className="block text-xs font-black text-zinc-500 uppercase mb-1">Logo Institucional</label>
                           <div className="flex items-center gap-4">
                              {settings.logo_url && <img src={settings.logo_url} className="w-16 h-16 object-contain bg-zinc-800 rounded-lg p-1 border border-zinc-700" />}
                              <div className="flex-1">
                                 <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20 transition" />
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-black text-zinc-500 uppercase mb-1">Teléfono</label>
                              <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-bold text-sm text-white" value={settings.contact_phone || ''} onChange={e => setSettings({ ...settings, contact_phone: e.target.value })} placeholder="+54 9 2901..." />
                           </div>
                           <div>
                              <label className="block text-xs font-black text-zinc-500 uppercase mb-1">Email</label>
                              <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-bold text-sm text-white" value={settings.contact_email || ''} onChange={e => setSettings({ ...settings, contact_email: e.target.value })} placeholder="admin@fev.com..." />
                           </div>
                        </div>

                        <div>
                           <label className="block text-xs font-black text-zinc-500 uppercase mb-1">Dirección / Sede</label>
                           <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-bold text-sm text-white" value={settings.contact_address || ''} onChange={e => setSettings({ ...settings, contact_address: e.target.value })} placeholder="Calle Falsa 123..." />
                        </div>

                        <div>
                           <label className="block text-xs font-black text-zinc-500 uppercase mb-1">Instagram (@usuario o URL)</label>
                           <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-bold text-sm text-white" value={settings.contact_instagram || ''} onChange={e => setSettings({ ...settings, contact_instagram: e.target.value })} placeholder="https://instagram.com/..." />
                        </div>
                     </div>
                  </div>

                  {/* Guardar Flotante en Móvil o Botón Normal */}
                  <div className="lg:col-span-2">
                     <button onClick={handleSaveGeneral} disabled={saving} className="w-full py-4 bg-tdf-blue text-white font-black rounded-xl hover:bg-blue-800 transition shadow-lg flex items-center justify-center gap-2">
                        {saving ? 'Guardando...' : <><Save size={20} /> Guardar Datos de Pago y Aranceles (Persistido)</>}
                     </button>
                  </div>
               </div>
            )}

            {/* === SPONSORS (PREMIUM UI) === */}
            {activeTab === 'sponsors' && (
               <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <header className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800/50">
                     <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Sponsors Oficiales</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-500">Aparecerán en el banner principal del sitio.</p>
                     </div>
                     <button
                        onClick={() => { resetSponsorForm(); setIsEditingSponsor(true) }}
                        className="bg-tdf-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                     >
                        <Plus className="w-5 h-5" /> Nuevo Sponsor
                     </button>
                  </header>

                  <div className="overflow-x-auto w-full">
                     <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-gray-50 dark:bg-zinc-800/50 text-xs font-bold text-slate-500 uppercase">
                           <tr>
                              <th className="p-4">Orden</th>
                              <th className="p-4">Logo</th>
                              <th className="p-4">Nombre / Web</th>
                              <th className="p-4 text-center">Activo</th>
                              <th className="p-4 text-right">Acciones</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                           {sponsors.map((sp) => (
                              <tr key={sp.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition">
                                 <td className="p-4 font-mono text-slate-400">#{sp.display_order}</td>
                                 <td className="p-4">
                                    <div className="w-24 h-12 relative bg-gray-100 dark:bg-zinc-800 rounded flex items-center justify-center p-2">
                                       {sp.logo_url ? (
                                          <img src={sp.logo_url} className="max-w-full max-h-full object-contain" alt={sp.name} />
                                       ) : <span className="text-xs text-slate-400">No img</span>}
                                    </div>
                                 </td>
                                 <td className="p-4">
                                    <div className="font-bold text-slate-700 dark:text-slate-200">{sp.name}</div>
                                    {sp.website && (
                                       <a href={sp.website} target="_blank" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                          {sp.website} <ExternalLink className="w-3 h-3" />
                                       </a>
                                    )}
                                 </td>
                                 <td className="p-4 text-center">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                       <input type="checkbox" checked={sp.active} onChange={() => handleToggleSponsorActive(sp)} className="sr-only peer" />
                                       <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                 </td>
                                 <td className="p-4 text-right space-x-2">
                                    <button onClick={() => handleEditSponsor(sp)} className="text-slate-400 hover:text-blue-500 p-2"><Upload className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteSponsor(sp.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {sponsors.length === 0 && (
                     <div className="p-12 text-center text-slate-400">No hay sponsors registrados</div>
                  )}

                  {/* MODAL PARA SPONSORS */}
                  {isEditingSponsor && (
                     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-zinc-700 animate-in zoom-in-95">
                           <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-bold dark:text-white">{sponsorForm.id ? 'Editar Sponsor' : 'Nuevo Sponsor'}</h3>
                              <button onClick={resetSponsorForm}><X className="w-6 h-6 text-slate-400 hover:text-white" /></button>
                           </div>

                           <form onSubmit={handleSaveSponsor} className="space-y-4">
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Nombre</label>
                                 <input
                                    className="w-full p-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm font-bold text-slate-800 dark:text-white"
                                    value={sponsorForm.name}
                                    onChange={e => setSponsorForm({ ...sponsorForm, name: e.target.value })}
                                    required
                                 />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Orden</label>
                                    <input
                                       type="number"
                                       className="w-full p-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm font-bold text-slate-800 dark:text-white"
                                       value={Number.isNaN(sponsorForm.display_order) ? '' : sponsorForm.display_order}
                                       onChange={e => setSponsorForm({ ...sponsorForm, display_order: parseInt(e.target.value) })}
                                    />
                                 </div>
                                 <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                       <input
                                          type="checkbox"
                                          checked={sponsorForm.active}
                                          onChange={e => setSponsorForm({ ...sponsorForm, active: e.target.checked })}
                                          className="w-5 h-5 rounded text-tdf-orange focus:ring-tdf-orange"
                                       />
                                       <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Visible</span>
                                    </label>
                                 </div>
                              </div>

                              <div>
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Website URL</label>
                                 <input
                                    className="w-full p-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm font-bold text-slate-800 dark:text-white"
                                    value={sponsorForm.website}
                                    onChange={e => setSponsorForm({ ...sponsorForm, website: e.target.value })}
                                    placeholder="https://..."
                                 />
                              </div>

                              <div>
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Logo</label>
                                 <div className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl p-4 text-center hover:border-tdf-orange transition cursor-pointer relative group">
                                    <input
                                       type="file"
                                       className="absolute inset-0 opacity-0 cursor-pointer"
                                       onChange={e => setSponsorLogoFile(e.target.files?.[0] || null)}
                                       accept="image/*"
                                    />
                                    {sponsorLogoFile || sponsorForm.logo_url ? (
                                       <div className="flex items-center justify-center gap-2 text-emerald-500 font-bold text-xs">
                                          <Upload className="w-4 h-4" />
                                          {sponsorLogoFile ? sponsorLogoFile.name : 'Imagen cargada'}
                                       </div>
                                    ) : (
                                       <div className="text-slate-400 text-xs">
                                          <Upload className="w-6 h-6 mx-auto mb-1" />
                                          Click para subir logo
                                       </div>
                                    )}
                                 </div>
                              </div>

                              <button className="w-full py-3 bg-tdf-orange hover:bg-orange-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 mt-4 shadow-lg active:scale-95 transition">
                                 <Save className="w-5 h-5" /> Guardar Sponsor
                              </button>
                           </form>
                        </div>
                     </div>
                  )}
               </div>
            )}

            {activeTab === 'categorias' && (
               <div className="bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-black text-white mb-4">Categorías de Competencia</h3>
                  <p className="text-sm text-zinc-500 mb-4">Estas categorías definen qué divisiones están disponibles para crear planteles y torneos.</p>

                  <form onSubmit={addCategory} className="flex flex-col md:flex-row gap-4 items-end mb-6 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                     <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Nueva Categoría</label>
                        <input required className="w-full p-2 rounded border border-zinc-800 bg-zinc-900 font-bold text-sm text-white" placeholder="Ej: Sub-14, Mayores" value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} />
                     </div>
                     <div className="w-full md:w-32">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Año Min</label>
                        <input type="number" className="w-full p-2 rounded border border-zinc-800 bg-zinc-900 font-bold text-sm text-white" placeholder="2000" value={newCategory.min_year || ''} onChange={e => setNewCategory({ ...newCategory, min_year: e.target.value })} />
                     </div>
                     <div className="w-full md:w-32">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Año Max</label>
                        <input type="number" className="w-full p-2 rounded border border-zinc-800 bg-zinc-900 font-bold text-sm text-white" placeholder="2010" value={newCategory.max_year || ''} onChange={e => setNewCategory({ ...newCategory, max_year: e.target.value })} />
                     </div>
                     <button className="bg-tdf-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition flex items-center gap-2 w-full md:w-auto justify-center"><Plus size={16} /> Crear</button>
                  </form>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                     {categories.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-tdf-blue transition shadow-sm">
                           <div>
                              <span className="font-bold text-zinc-300 block">{c.name}</span>
                              {(c.min_year || c.max_year) && (
                                 <span className="text-xs text-zinc-500 font-mono">
                                    {c.min_year ? `Min: ${c.min_year}` : ''} {c.max_year ? `Max: ${c.max_year}` : ''}
                                 </span>
                              )}
                           </div>
                           <button onClick={() => deleteCategory(c.id)} className="text-zinc-500 hover:text-red-600 transition"><Trash2 size={16} /></button>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* Placeholders for other tabs for brevity */}
            {activeTab === 'sedes' && (
               <div className="bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-black text-white mb-4">Sedes y Estadios</h3>
                  <p className="text-sm text-zinc-500 mb-6">Administra los lugares de juego. Agrega el link de Google Maps para facilitar la ubicación.</p>

                  <form onSubmit={handleAddVenue} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                     <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Nombre Sede</label>
                        <input name="name" required className="w-full p-2 rounded border border-zinc-800 bg-zinc-900 font-bold text-sm text-white" placeholder="Ej: Polideportivo Municipal" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Dirección</label>
                        <input name="address" className="w-full p-2 rounded border border-zinc-800 bg-zinc-900 font-bold text-sm text-white" placeholder="Calle 123" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Link Google Maps</label>
                        <input name="mapUrl" className="w-full p-2 rounded border border-zinc-800 bg-zinc-900 font-bold text-sm text-white" placeholder="https://maps.google..." />
                     </div>
                     <div className="md:col-span-3 text-right">
                        <button className="bg-tdf-orange text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition inline-flex items-center gap-2"><Plus size={16} /> Agregar Sede</button>
                     </div>
                  </form>

                  <div className="grid grid-cols-1 gap-3">
                     {venues.map((v) => (
                        <div key={v.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-tdf-blue transition shadow-sm">
                           <div>
                              <div className="flex items-center gap-2">
                                 <MapPin size={18} className="text-tdf-blue" />
                                 <span className="font-bold text-zinc-200">{v.name}</span>
                              </div>
                              <div className="text-xs text-zinc-500 ml-6 flex gap-3 mt-1">
                                 <span>{v.address || 'Sin dirección'}</span>
                                 {v.google_maps_url && <a href={v.google_maps_url} target="_blank" className="text-blue-500 font-bold hover:underline flex items-center gap-1">Ver Mapa <MapPin size={10} /></a>}
                              </div>
                           </div>
                           <button onClick={async () => {
                              if (confirm('¿Eliminar sede?')) {
                                 await supabase.from('venues').delete().eq('id', v.id);
                                 fetchSubData();
                              }
                           }} className="text-zinc-600 hover:text-red-500 p-2 mt-2 md:mt-0 self-end"><Trash2 size={16} /></button>
                        </div>
                     ))}
                     {venues.length === 0 && <p className="text-center text-zinc-500 italic py-8">No hay sedes cargadas.</p>}
                  </div>
               </div>
            )}

            {activeTab === 'tramites' && (
               <div className="bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-black text-white mb-4">Costos de Trámites Federativos</h3>
                  <div className="space-y-6">
                     {/* BANK INFO SECTION */}
                     <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Datos Bancarios para Transferencias</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Banco</label>
                              <input className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-bold text-sm" placeholder="Ej: Banco Tierra del Fuego" value={settings.bank_name || ''} onChange={e => setSettings({ ...settings, bank_name: e.target.value })} />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Titular</label>
                              <input className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-bold text-sm" placeholder="Ej: Feva Ushuaia" value={settings.bank_holder || ''} onChange={e => setSettings({ ...settings, bank_holder: e.target.value })} />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">CBU / CVU</label>
                              <input className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-bold text-sm font-mono" placeholder="000000..." value={settings.bank_cbu || ''} onChange={e => setSettings({ ...settings, bank_cbu: e.target.value })} />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Alias</label>
                              <input className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-bold text-sm" placeholder="somos.voley.tdf" value={settings.bank_alias || ''} onChange={e => setSettings({ ...settings, bank_alias: e.target.value })} />
                           </div>
                           <div className="md:col-span-2">
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">CUIT / CUIL</label>
                              <input className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-bold text-sm font-mono" placeholder="20-12345678-9" value={settings.bank_cuit || ''} onChange={e => setSettings({ ...settings, bank_cuit: e.target.value })} />
                           </div>
                        </div>
                     </div>

                     {/* EXISTING FEES SECTION */}
                     <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2 pt-2">Tarifario de Aranceles</h4>
                     {tramites.map((t: any, i: number) => {
                        const isSystemFee = ['inscripcion de clubes', 'inscripcion de jugadoras/es', 'pase a prestamo', 'pase', 'inscripción de clubes', 'inscripción de jugadoras/es', 'pase a préstamo'].includes(t.title?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                        return (
                           <div key={i} className="flex gap-4 items-center">
                              <input
                                 className={`flex-1 p-3 bg-zinc-950 border border-zinc-800 rounded-lg font-bold text-white placeholder-zinc-600 ${isSystemFee ? 'opacity-60 cursor-not-allowed text-zinc-400' : ''}`}
                                 placeholder="Nombre (Ej: Pase Interclub)"
                                 value={t.title}
                                 readOnly={isSystemFee}
                                 onChange={e => {
                                    if (isSystemFee) return;
                                    const newT = [...tramites]; newT[i].title = e.target.value; setTramites(newT);
                                 }}
                              />
                              <div className="relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                 <input className="w-32 p-3 pl-8 bg-zinc-950 border border-zinc-800 rounded-lg font-bold text-white placeholder-zinc-600 focus:border-tdf-blue outline-none" placeholder="0" value={t.price} onChange={e => {
                                    const newT = [...tramites]; newT[i].price = e.target.value; setTramites(newT);
                                 }} />
                              </div>
                              {!isSystemFee ? (
                                 <button onClick={() => {
                                    const newT = tramites.filter((_, idx) => idx !== i); setTramites(newT);
                                 }} className="text-red-400 hover:bg-red-500/10 p-2 rounded"><Trash2 size={18} /></button>
                              ) : (
                                 <div className="w-[34px]" title="Arancel de Sistema"></div>
                              )}
                           </div>
                        )
                     })}
                     <button onClick={() => setTramites([...tramites, { title: '', price: '0' }])} className="text-tdf-blue font-bold text-sm flex items-center gap-2 hover:bg-blue-500/10 px-4 py-2 rounded-lg w-fit transition"><Plus size={16} /> Agregar Item</button>

                     <button onClick={handleSaveGeneral} disabled={saving} className="mt-4 w-full py-4 bg-tdf-blue text-white font-black rounded-xl hover:bg-blue-800 transition shadow-lg flex items-center justify-center gap-2">
                        {saving ? 'Guardando...' : <><Save size={20} /> Guardar Datos de Pago y Aranceles (Persistido)</>}
                     </button>
                  </div>
               </div>
            )}

         </div>
      </div>
   );
}