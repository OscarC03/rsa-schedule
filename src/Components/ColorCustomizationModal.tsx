import React, { useState, useEffect } from 'react';
import { 
  coloriTurni, 
  coloriTurniAlternativi, 
  getDayColorCustomizations, 
  saveDayColorCustomizations,
  DayColorCustomization,
  italianNames 
} from './constants';

interface ColorCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedYear: number;
  selectedMonth: number;
  onColorChange: () => void;
}

const ColorCustomizationModal: React.FC<ColorCustomizationModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedYear,
  selectedMonth,
  onColorChange
}) => {
  const [useAlternativeColors, setUseAlternativeColors] = useState(false);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && selectedDate) {
      // Carica le personalizzazioni esistenti per questa data
      const customizations = getDayColorCustomizations(selectedYear, selectedMonth);
      const existing = customizations.find(c => c.date === selectedDate);
        if (existing) {
        setUseAlternativeColors(existing.useAlternativeColors);
        setCustomColors(existing.customColors || {});
      } else {
        setUseAlternativeColors(false);
        setCustomColors({});
      }
    }
  }, [isOpen, selectedDate, selectedYear, selectedMonth]);

  const handleSave = () => {
    const customizations = getDayColorCustomizations(selectedYear, selectedMonth);
    const filteredCustomizations = customizations.filter(c => c.date !== selectedDate);
    
    // Aggiungi solo se ci sono personalizzazioni
    if (useAlternativeColors || Object.keys(customColors).length > 0) {
      const newCustomization: DayColorCustomization = {
        date: selectedDate,
        useAlternativeColors,
        customColors: Object.keys(customColors).length > 0 ? customColors : undefined
      };
      filteredCustomizations.push(newCustomization);
    }
    
    saveDayColorCustomizations(selectedYear, selectedMonth, filteredCustomizations);
    onColorChange();
    onClose();
  };

  const handleReset = () => {
    setUseAlternativeColors(false);
    setCustomColors({});
  };

  const handleColorChange = (shiftType: string, color: string) => {
    setCustomColors(prev => ({
      ...prev,
      [shiftType]: color
    }));
  };

  const getCurrentColors = () => {
    const baseColors = useAlternativeColors ? coloriTurniAlternativi : coloriTurni;
    return { ...baseColors, ...customColors };
  };

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const currentColors = getCurrentColors();
  const mainShiftTypes = ['Morning', 'MorningI', 'Afternoon', 'Split', 'Night', 'Free'];
  const absenceTypes = ['Ferie', 'Permesso', 'Malattia', 'RiposoCompensativo', 'Riposo', 'RiposoCambioDivisa'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        width: '90vw'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1f2937',
            margin: 0
          }}>
            Personalizza Colori
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>        <div style={{ marginBottom: '20px' }}>
          <p style={{ 
            fontSize: '1rem', 
            color: '#6b7280',
            margin: '0 0 16px 0'
          }}>
            {formatDate(selectedDate)}
            {(useAlternativeColors || Object.keys(customColors).length > 0) && (
              <span style={{
                fontSize: '0.85rem',
                color: '#f59e0b',
                fontWeight: 500,
                marginLeft: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🎨 Personalizzazioni attive
              </span>
            )}
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '1rem',
              color: '#374151',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={useAlternativeColors}
                onChange={(e) => setUseAlternativeColors(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#6366f1'
                }}
              />
              Usa schema colori alternativi
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px'
          }}>
            Turni
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '12px'
          }}>
            {mainShiftTypes.map(shiftType => (
              <div key={shiftType} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: currentColors[shiftType],
                  borderRadius: '6px',
                  border: '1px solid #d1d5db'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>
                    {italianNames[shiftType] || shiftType}
                  </div>
                  <input
                    type="color"
                    value={currentColors[shiftType]}
                    onChange={(e) => handleColorChange(shiftType, e.target.value)}
                    style={{
                      width: '60px',
                      height: '24px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px'
          }}>
            Assenze
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '12px'
          }}>
            {absenceTypes.map(absenceType => (
              <div key={absenceType} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: currentColors[absenceType],
                  borderRadius: '6px',
                  border: '1px solid #d1d5db'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>
                    {italianNames[absenceType] || absenceType}
                  </div>
                  <input
                    type="color"
                    value={currentColors[absenceType]}
                    onChange={(e) => handleColorChange(absenceType, e.target.value)}
                    style={{
                      width: '60px',
                      height: '24px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            Reset
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#5b5bd6';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#6366f1';
              }}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorCustomizationModal;
