import PropTypes from 'prop-types';

const AdminSimulationPage = ({
  simulationName,
  setSimulationName,
  scenarioType,
  setScenarioType,
  scenarioParams,
  setScenarioParams,
  isSimulating,
  onRunSimulation,
  onClearSimulations,
  simulationScenarios,
  activeScenarioId,
  setActiveScenario,
  onDeleteScenario,
  onToggleSlot,
  activeScenario,
  getWeekdayLabel
}) => {
  const scenarioList = Object.values(simulationScenarios || {});

  const renderScenarioSpecificInputs = () => {
    if (scenarioType === 'more_free') {
      return (
        <input
          className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          type="number"
          step="0.05"
          min="0"
          max="1"
          value={scenarioParams.deltaPercent}
          onChange={(e) => setScenarioParams((prev) => ({ ...prev, deltaPercent: Number(e.target.value) }))}
          placeholder="Free delta (0.2)"
        />
      );
    }

    if (scenarioType === 'teacher_absence') {
      return (
        <input
          className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Teacher ID (e.g., T-123)"
          value={scenarioParams.teacherId}
          onChange={(e) => setScenarioParams((prev) => ({ ...prev, teacherId: e.target.value }))}
        />
      );
    }

    if (scenarioType === 'elective_shift') {
      return (
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <input
            className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            type="number"
            value={scenarioParams.electiveFrom}
            onChange={(e) => setScenarioParams((prev) => ({ ...prev, electiveFrom: Number(e.target.value) }))}
            placeholder="From index"
          />
          <input
            className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            type="number"
            value={scenarioParams.electiveTo}
            onChange={(e) => setScenarioParams((prev) => ({ ...prev, electiveTo: Number(e.target.value) }))}
            placeholder="To index"
          />
        </div>
      );
    }

    if (scenarioType === 'enrollment_increase') {
      return (
        <input
          className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          type="number"
          value={scenarioParams.enrollmentIncrease}
          onChange={(e) => setScenarioParams((prev) => ({ ...prev, enrollmentIncrease: Number(e.target.value) }))}
          placeholder="Additional students"
        />
      );
    }

    if (scenarioType === 'exam_shift') {
      return (
        <input
          className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          type="number"
          value={scenarioParams.deltaPercent}
          onChange={(e) => setScenarioParams((prev) => ({ ...prev, deltaPercent: Number(e.target.value) }))}
          placeholder="Extra breaks count"
        />
      );
    }

    return null;
  };

  return (
    <div className="simulation-page bg-gray-100 text-neutral-900">
      <div className="simulation-content mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="simulation-header flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Simulation Workspace</h1>
          <p className="text-sm text-neutral-600">Create what-if scenarios, compare results, and fine-tune timetables.</p>
        </header>

        <section className="simulation-controls rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex w-full flex-col gap-2 lg:w-1/3">
              <label className="text-sm font-medium text-neutral-700">Scenario name</label>
              <input
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Enter name"
                value={simulationName}
                onChange={(e) => setSimulationName(e.target.value)}
              />
            </div>

            <div className="flex w-full flex-col gap-2 lg:w-1/3">
              <label className="text-sm font-medium text-neutral-700">Scenario type</label>
              <select
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
              >
                <option value="more_free">More Free Periods</option>
                <option value="teacher_absence">Teacher Absence</option>
                <option value="elective_shift">Elective Time Shift</option>
                <option value="enrollment_increase">Enrollment Increase</option>
                <option value="exam_shift">Exam / Block Shift</option>
              </select>
            </div>

            <div className="flex w-full flex-col gap-2 lg:w-1/3">
              <label className="text-sm font-medium text-neutral-700">Parameters</label>
              {renderScenarioSpecificInputs()}
            </div>

            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row">
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                onClick={onRunSimulation}
              >
                {isSimulating ? 'Running...' : 'Run Simulation'}
              </button>
              <button
                className="mt-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 lg:mt-0 lg:ml-3"
                onClick={onClearSimulations}
              >
                Clear All
              </button>
            </div>
          </div>
        </section>

        <section className="simulation-body grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className="scenario-list rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Scenarios</h2>
              <span className="text-xs font-medium text-neutral-500">{scenarioList.length} saved</span>
            </div>
            <ul className="mt-4 space-y-3 overflow-auto">
              {scenarioList.length === 0 && (
                <li className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center text-xs text-neutral-500">
                  No scenarios yet. Run a simulation to populate this list.
                </li>
              )}
              {scenarioList.map((scenario) => (
                <li
                  key={scenario.id}
                  className={`rounded-xl border px-4 py-3 text-sm transition ${activeScenarioId === scenario.id ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-neutral-200 bg-white hover:border-blue-200 hover:bg-blue-50/70'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900">{scenario.name}</p>
                      <p className="text-xs uppercase tracking-wide text-neutral-500">{scenario.scenarioType.replace(/_/g, ' ')}</p>
                      <p className="mt-1 text-xs text-neutral-500">Created: {new Date(scenario.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <button
                        className="rounded-md bg-green-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-green-600"
                        onClick={() => setActiveScenario(scenario.id)}
                      >
                        View
                      </button>
                      <button
                        className="rounded-md bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-red-600"
                        onClick={() => onDeleteScenario(scenario.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="scenario-preview flex flex-col gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-neutral-900">Preview</h2>
                {!activeScenario && (
                  <span className="text-xs text-neutral-500">Select a scenario to review generated timetables.</span>
                )}
              </div>

              {activeScenario && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="font-semibold text-neutral-900">{activeScenario.name} — {activeScenario.scenarioType}</p>
                    <p className="mt-1 text-xs text-neutral-500">Double-click a slot to toggle between Free and Custom.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.keys(activeScenario.timetables || {}).map((className) => (
                      <div key={className} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-neutral-800">{className}</h3>
                        <div className="mt-3 space-y-3 text-xs text-neutral-700">
                          {(activeScenario.timetables[className] || []).map((dayRow, dayIndex) => (
                            <div key={`${className}-${dayIndex}`} className="rounded-lg border border-neutral-200 bg-white p-3">
                              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{getWeekdayLabel(dayIndex)}</div>
                              <div className="mt-2 grid grid-cols-4 gap-2">
                                {dayRow.map((cell, periodIndex) => {
                                  const isBreak = cell?.status === 'break';
                                  const isFree = cell?.status === 'free';
                                  return (
                                    <button
                                      key={`${className}-${dayIndex}-${periodIndex}`}
                                      className={`min-h-[48px] rounded-lg border px-2 py-2 text-left text-xs font-medium transition ${isBreak ? 'cursor-not-allowed border-neutral-300 bg-neutral-200 text-neutral-500' : isFree ? 'border-dashed border-neutral-400 bg-white text-neutral-500 hover:border-blue-400 hover:text-blue-600' : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300'}`}
                                      onClick={() => !isBreak && onToggleSlot(className, dayIndex, periodIndex)}
                                      type="button"
                                    >
                                      {cell?.subjectName || 'N/A'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {activeScenario && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-neutral-900">Metrics</h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-800">Summary</h3>
                    <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                      <li>Total free slots (baseline): {activeScenario.baselineMetrics?.totalFree ?? 'N/A'}</li>
                      <li>Total free slots (scenario): {activeScenario.metrics?.totalFree ?? 'N/A'}</li>
                      <li>Teacher conflicts (scenario): {activeScenario.metrics?.teacherConflicts?.length ?? 0}</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-800">Top Teachers</h3>
                    <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                      {Object.entries(activeScenario.metrics?.teacherAssignments || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([teacherId, count]) => (
                          <li key={teacherId}>
                            {teacherId}: {count} slots {activeScenario.metrics?.teacherHours?.[teacherId] ? `(${activeScenario.metrics.teacherHours[teacherId].toFixed(1)}h)` : ''}
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:col-span-2">
                    <h3 className="text-sm font-semibold text-neutral-800">Student Hours</h3>
                    <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                      {Object.entries(activeScenario.metrics?.studentHoursByClass || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([className, hours]) => (
                          <li key={className}>{className}: {Math.round(hours)} student-hours</li>
                        ))}
                    </ul>
                  </div>
                  {activeScenario.substitutions && Object.keys(activeScenario.substitutions).length > 0 && (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:col-span-2">
                      <h3 className="text-sm font-semibold text-neutral-800">Substitutions</h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-neutral-600">
                        {Object.entries(activeScenario.substitutions).map(([className, substitutions]) =>
                          substitutions.map((item, index) => (
                            <li key={`${className}-${index}`}>
                              {className}: {getWeekdayLabel(item.dayIndex)} Period {item.periodIndex + 1}: {item.from} → {item.to || 'FREE'}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

AdminSimulationPage.propTypes = {
  simulationName: PropTypes.string.isRequired,
  setSimulationName: PropTypes.func.isRequired,
  scenarioType: PropTypes.string.isRequired,
  setScenarioType: PropTypes.func.isRequired,
  scenarioParams: PropTypes.object.isRequired,
  setScenarioParams: PropTypes.func.isRequired,
  isSimulating: PropTypes.bool.isRequired,
  onRunSimulation: PropTypes.func.isRequired,
  onClearSimulations: PropTypes.func.isRequired,
  simulationScenarios: PropTypes.object.isRequired,
  activeScenarioId: PropTypes.string,
  setActiveScenario: PropTypes.func.isRequired,
  onDeleteScenario: PropTypes.func.isRequired,
  onToggleSlot: PropTypes.func.isRequired,
  activeScenario: PropTypes.object,
  getWeekdayLabel: PropTypes.func.isRequired
};

export default AdminSimulationPage;
