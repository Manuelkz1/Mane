import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, X, Save, Image as ImageIcon, Lock, Unlock, TruckIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CompanySettings {
  id: string;
  name: string;
  logo_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  logo_width: number;
  logo_height: number;
  maintain_ratio: boolean;
  dropshipping_shipping_cost: number;
  updated_at: string;
}

// Default settings to use when no row exists
const defaultSettings: Omit<CompanySettings, 'id' | 'updated_at'> = {
  name: 'Calidad Premium',
  logo_url: null,
  hero_title: 'Productos de Calidad Premium',
  hero_subtitle: 'Descubre nuestra selección de productos exclusivos con la mejor calidad garantizada',
  logo_width: 200,
  logo_height: 60,
  maintain_ratio: true,
  dropshipping_shipping_cost: 0
};

export function CompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState(200);
  const [logoHeight, setLogoHeight] = useState(60);
  const [maintainRatio, setMaintainRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(200 / 60);
  const [dropshippingShippingCost, setDropshippingShippingCost] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const createDefaultSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .insert({
          ...defaultSettings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error('Error creating default settings:', error);
      throw error;
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // First try to get existing settings
      let { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1);

      // If no settings exist, create default ones
      if ((!data || data.length === 0) && !error) {
        try {
          data = [await createDefaultSettings()];
        } catch (createError) {
          console.error('Error creating default settings:', createError);
          // Fall back to using default settings without saving to DB
          data = [{
            id: 'temp-id',
            ...defaultSettings,
            updated_at: new Date().toISOString()
          }];
        }
      } else if (error) {
        console.error('Error loading settings:', error);
        // Fall back to using default settings without saving to DB
        data = [{
          id: 'temp-id',
          ...defaultSettings,
          updated_at: new Date().toISOString()
        }];
      }

      const settingsData = data[0];
      setSettings(settingsData);
      setCompanyName(settingsData.name || defaultSettings.name);
      setHeroTitle(settingsData.hero_title || defaultSettings.hero_title);
      setHeroSubtitle(settingsData.hero_subtitle || defaultSettings.hero_subtitle);
      setPreviewLogo(settingsData.logo_url);
      setLogoWidth(settingsData.logo_width || defaultSettings.logo_width);
      setLogoHeight(settingsData.logo_height || defaultSettings.logo_height);
      setMaintainRatio(settingsData.maintain_ratio !== undefined ? settingsData.maintain_ratio : defaultSettings.maintain_ratio);
      setDropshippingShippingCost(settingsData.dropshipping_shipping_cost || defaultSettings.dropshipping_shipping_cost);
      
      if (settingsData.logo_url && settingsData.maintain_ratio) {
        // Load image to get natural dimensions
        const img = new Image();
        img.onload = () => {
          setAspectRatio(img.naturalWidth / img.naturalHeight);
        };
        img.src = settingsData.logo_url;
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar la configuración');
      
      // Fall back to default settings
      const defaultData = {
        id: 'temp-id',
        ...defaultSettings,
        updated_at: new Date().toISOString()
      };
      
      setSettings(defaultData);
      setCompanyName(defaultData.name);
      setHeroTitle(defaultData.hero_title);
      setHeroSubtitle(defaultData.hero_subtitle);
      setPreviewLogo(defaultData.logo_url);
      setLogoWidth(defaultData.logo_width);
      setLogoHeight(defaultData.logo_height);
      setMaintainRatio(defaultData.maintain_ratio);
      setDropshippingShippingCost(defaultData.dropshipping_shipping_cost);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no permitido. Use PNG, JPG o SVG');
      return null;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 2MB');
      return null;
    }

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { error: uploadError, data } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      // Load image to get natural dimensions
      const img = new Image();
      img.onload = () => {
        const naturalRatio = img.naturalWidth / img.naturalHeight;
        setAspectRatio(naturalRatio);
        if (maintainRatio) {
          // Set initial dimensions maintaining aspect ratio
          const newWidth = Math.min(200, img.naturalWidth);
          setLogoWidth(newWidth);
          setLogoHeight(Math.round(newWidth / naturalRatio));
        }
      };
      img.src = publicUrl;

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('Error al subir el logo');
      return null;
    }
  };

  const handleWidthChange = (newWidth: number) => {
    newWidth = Math.min(500, Math.max(50, newWidth));
    setLogoWidth(newWidth);
    if (maintainRatio) {
      setLogoHeight(Math.round(newWidth / aspectRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    newHeight = Math.min(500, Math.max(50, newHeight));
    setLogoHeight(newHeight);
    if (maintainRatio) {
      setLogoWidth(Math.round(newHeight * aspectRatio));
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      // Validate company name
      if (!companyName.trim()) {
        toast.error('El nombre de la empresa es requerido');
        return;
      }

      if (companyName.length > 50) {
        toast.error('El nombre es demasiado largo (máximo 50 caracteres)');
        return;
      }

      // Validate hero text
      if (!heroTitle.trim() || !heroSubtitle.trim()) {
        toast.error('El título y subtítulo del hero son requeridos');
        return;
      }

      // Validate dropshipping shipping cost
      if (dropshippingShippingCost < 0) {
        toast.error('El costo de envío para dropshipping no puede ser negativo');
        return;
      }

      // Handle logo upload if a new file is selected
      let logoUrl = settings.logo_url;
      if (fileInputRef.current?.files?.length) {
        const file = fileInputRef.current.files[0];
        const newLogoUrl = await handleLogoUpload(file);
        if (newLogoUrl) {
          // Delete old logo if exists
          if (settings.logo_url) {
            const oldLogoPath = settings.logo_url.split('/').pop();
            if (oldLogoPath) {
              await supabase.storage
                .from('logos')
                .remove([oldLogoPath]);
            }
          }
          logoUrl = newLogoUrl;
        }
      }

      const updateData = {
        name: companyName,
        logo_url: logoUrl,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        logo_width: logoWidth,
        logo_height: logoHeight,
        maintain_ratio: maintainRatio,
        dropshipping_shipping_cost: dropshippingShippingCost,
        updated_at: new Date().toISOString()
      };

      let result;
      if (settings.id === 'temp-id') {
        // If we're working with temporary settings, create a new record
        const { data, error } = await supabase
          .from('company_settings')
          .insert(updateData)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Otherwise update the existing record
        const { data, error } = await supabase
          .from('company_settings')
          .update(updateData)
          .eq('id', settings.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }

      toast.success('Configuración guardada exitosamente');
      setSettings(result);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings?.logo_url) return;

    try {
      setSaving(true);

      // Delete logo file
      const logoPath = settings.logo_url.split('/').pop();
      if (logoPath) {
        await supabase.storage
          .from('logos')
          .remove([logoPath]);
      }

      // Update settings
      const { error } = await supabase
        .from('company_settings')
        .update({
          logo_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Logo eliminado exitosamente');
      setPreviewLogo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadSettings();
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast.error('Error al eliminar el logo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Configuración de la Empresa
      </h2>

      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la Empresa
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Nombre de la empresa"
            maxLength={50}
          />
          <p className="mt-1 text-sm text-gray-500">
            {companyName.length}/50 caracteres
          </p>
        </div>

        {/* Hero Text */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Texto Principal (Hero)
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título Principal
            </label>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Título principal del hero"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtítulo
            </label>
            <textarea
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Subtítulo del hero"
            />
          </div>
        </div>

        {/* Dropshipping Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <TruckIcon className="h-5 w-5 mr-2" />
            Configuración de Dropshipping
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Costo de Envío para Usuarios Dropshipping
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={dropshippingShippingCost}
                onChange={(e) => setDropshippingShippingCost(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Este costo se aplicará a los pedidos realizados por usuarios con rol de dropshipping. 
              Si se establece en 0, el envío será gratuito para estos usuarios.
            </p>
          </div>
        </div>

        {/* Logo Management */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo de la Empresa
          </label>

          {/* Logo Preview */}
          <div className="mb-4">
            {previewLogo ? (
              <div className="relative inline-block">
                <img
                  ref={logoRef}
                  src={previewLogo}
                  alt="Logo de la empresa"
                  style={{
                    width: `${logoWidth}px`,
                    height: `${logoHeight}px`
                  }}
                  className="object-contain border rounded-md"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                  title="Eliminar logo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-[200px] h-[60px] bg-gray-100 border-2 border-dashed border-gray-300 rounded-md">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Logo Dimensions */}
          {previewLogo && (
            <div className="space-y-4 mb-4">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ancho (px)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="50"
                      max="500"
                      value={logoWidth}
                      onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                      className="w-32"
                    />
                    <input
                      type="number"
                      min="50"
                      max="500"
                      value={logoWidth}
                      onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alto (px)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="50"
                      max="500"
                      value={logoHeight}
                      onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                      className="w-32"
                    />
                    <input
                      type="number"
                      min="50"
                      max="500"
                      value={logoHeight}
                      onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMaintainRatio(!maintainRatio)}
                  className={`flex items-center px-3 py-1 rounded-md text-sm ${
                    maintainRatio
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {maintainRatio ? (
                    <Lock className="h-4 w-4 mr-1" />
                  ) : (
                    <Unlock className="h-4 w-4 mr-1" />
                  )}
                  Mantener proporción
                </button>
                <button
                  onClick={() => {
                    setLogoWidth(200);
                    setLogoHeight(60);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Restablecer tamaño
                </button>
              </div>
            </div>
          )}

          {/* Logo Upload */}
          <div className="flex items-center space-x-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".png,.jpg,.jpeg,.svg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Show preview
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setPreviewLogo(e.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Logo
            </button>
            <div className="text-sm text-gray-500">
              PNG, JPG o SVG. Máximo 2MB.
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}