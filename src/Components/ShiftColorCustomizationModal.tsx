import React, { useState, useEffect } from 'react';
import { ResourceShift, ShiftType, AbsenceType } from '@/model/model';
import { coloriTurni, italianNames, getColorsForDate } from './constants';

interface ShiftColorCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ResourceShift | null;
  resourceName: string;
  selectedYear: number;
  selectedMonth: number;
  onColorChange: (customColor?: string) => void;
}

const ShiftColorCustomizationModal: React.FC<ShiftColorCustomizationModalProps> = ({
  isOpen,
  onClose,
  shift,
  resourceName,
  selectedYear,
  selectedMonth,
  onColorChange
}) => {
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [useDefaultColor, setUseDefaultColor] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && shift) {
      if (shift.customColor) {
        setSelectedColor(shift.customColor);
        setUseDefaultColor(false);
      } else {
        // Ottieni il colore di default per questo turno/assenza
        const dayColors = getColorsForDate(shift.date, selectedYear, selectedMonth);
        const defaultColor = shift.absence 
          ? dayColors[shift.absence] 
          : dayColors[shift.shiftType];
        setSelectedColor(defaultColor || '#f3f4f6');
        setUseDefaultColor(true);
      }
    }
  }, [isOpen, shift, selectedYear, selectedMonth]);

  const handleSave = () => {
    if (useDefaultColor) {
      onColorChange(undefined); // Rimuovi colore personalizzato
    } else {
      onColorChange(selectedColor); // Usa colore personalizzato
    }
    onClose();
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setUseDefaultColor(false);
  };

  const getDefaultColor = (): string => {
    if (!shift) return '#f3f4f6';
    const dayColors = getColorsForDate(shift.date, selectedYear, selectedMonth);
    return shift.absence 
      ? dayColors[shift.absence] 
      : dayColors[shift.shiftType];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getShiftLabel = () => {
    if (!shift) return '';
    if (shift.absence) {
      return `${italianNames[shift.absence] || shift.absence}${
        shift.absenceHours ? ` (${shift.absenceHours}h)` : ''
      }`;
    }
    return `${italianNames[shift.shiftType] || shift.shiftType}${
      shift.floor > 0 ? ` - Piano ${shift.floor === 3 ? 'RA' : shift.floor}` : ''
    }`;
  };

  if (!isOpen || !shift) return null;

  const presetColors = [
    '#b7eacb', '#ffe5b4', '#b4d8ff', '#c7bfff', '#ffe4e1', '#fff9c4',
    '#a7d8bd', '#ffd48a', '#9bc7ff', '#b8a9ff', '#ffb3b3', '#fff176',
    '#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa',
    '#f43f5e', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
    '#ec4899', '#84cc16', '#06b6d4', '#6366f1', '#d946ef', '#f97316'
  ];

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
      zIndex: 1001
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '450px',
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
            fontSize: '1.3rem',
            fontWeight: 700,
            color: '#1f2937',
            margin: 0
          }}>
            Personalizza Colore Turno
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
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              {resourceName} • {formatDate(shift.date)}
            </div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#374151'
            }}>
              {getShiftLabel()}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '1rem',
              color: '#374151',
              cursor: 'pointer',
              marginBottom: '12px'
            }}>
              <input
                type="checkbox"
                checked={useDefaultColor}
                onChange={(e) => {
                  setUseDefaultColor(e.target.checked);
                  if (e.target.checked) {
                    setSelectedColor(getDefaultColor());
                  }
                }}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#6366f1'
                }}
              />
              Usa colore predefinito
            </label>
            
            {useDefaultColor && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                color: '#6b7280',
                marginLeft: '24px'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: getDefaultColor(),
                  borderRadius: '4px',
                  border: '1px solid #d1d5db'
                }} />
                Colore base del turno
              </div>
            )}
          </div>
        </div>

        {!useDefaultColor && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '12px'
            }}>
              Scegli colore personalizzato
            </h3>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: selectedColor,
                borderRadius: '8px',
                border: '2px solid #d1d5db'
              }} />
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => handleColorChange(e.target.value)}
                style={{
                  width: '80px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>
                  Colore selezionato
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' }}>
                  {selectedColor.toUpperCase()}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Colori predefiniti
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '6px'
              }}>
                {presetColors.map(color => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: color,
                      border: selectedColor === color ? '2px solid #6366f1' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (selectedColor !== color) {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => {
              setUseDefaultColor(true);
              setSelectedColor(getDefaultColor());
            }}
            style={{
              padding: '10px 16px',
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
                padding: '10px 16px',
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
                padding: '10px 16px',
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

export default ShiftColorCustomizationModal;
