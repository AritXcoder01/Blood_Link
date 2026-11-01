import React, { useState, useEffect } from 'react';
import { Building2, Phone, Mail, MapPin, CheckCircle2, Search, ExternalLink } from 'lucide-react';
import { Hospital } from '../types';
import { InteractiveMap } from '../components/InteractiveMap';

export const HospitalsPage: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await fetch('/api/v1/hospitals');
        const data = await res.json();
        if (data.success) {
          setHospitals(data.hospitals || []);
          if (data.hospitals?.length > 0) {
            setSelectedHospital(data.hospitals[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load hospitals:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHospitals();
  }, []);

  const filtered = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.district.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mapMarkers = hospitals.map((h) => ({
    id: h.id,
    lat: Number(h.latitude),
    lng: Number(h.longitude),
    title: h.name,
    subtitle: h.address,
    type: 'hospital' as const,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-bold text-blood-700 uppercase tracking-wider">
          Healthcare Facility Directory
        </span>
        <h1 className="text-3xl font-extrabold text-charcoal-900 tracking-tight">
          Hospitals & Authorized Blood Centres
        </h1>
        <p className="text-sm text-gray-600">
          Partner hospital blood centres equipped for component separation, apheresis, and clinical cross-matching.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search by hospital name, area, or district..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-xs text-charcoal-800 focus:ring-2 focus:ring-blood-700 focus:outline-none bg-white shadow-xs"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Hospital Cards List */}
        <div className="lg:col-span-7 space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-gray-500">Loading verified hospital directory...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-xs text-gray-500">
              No hospital blood centers found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filtered.map((h) => {
              const isSelected = selectedHospital?.id === h.id;
              return (
                <div
                  key={h.id}
                  onClick={() => setSelectedHospital(h)}
                  className={`p-5 rounded-2xl bg-white border cursor-pointer transition shadow-xs hover:shadow-md space-y-3 ${
                    isSelected ? 'border-blood-700 ring-2 ring-blood-700/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-blood-50 text-blood-700 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-charcoal-900">{h.name}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {h.address}
                        </p>
                      </div>
                    </div>

                    {h.blood_bank_available && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Blood Centre Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal-700 pt-2 border-t border-gray-100">
                    <a
                      href={`tel:${h.contact_number}`}
                      className="inline-flex items-center gap-1.5 text-blood-700 hover:underline font-medium"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {h.contact_number}
                    </a>
                    {h.email && (
                      <a
                        href={`mailto:${h.email}`}
                        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-charcoal-900"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {h.email}
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Map View */}
        <div className="lg:col-span-5 h-[450px] sticky top-24">
          <InteractiveMap
            center={
              selectedHospital
                ? [Number(selectedHospital.latitude), Number(selectedHospital.longitude)]
                : [18.5204, 73.8567]
            }
            zoom={selectedHospital ? 14 : 12}
            markers={mapMarkers}
            showProgressiveRadius={false}
          />
        </div>
      </div>
    </div>
  );
};
